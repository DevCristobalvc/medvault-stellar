#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, vec, Address, Bytes, BytesN, Env, String, Vec,
};

#[contracttype]
#[derive(Clone)]
pub struct Document {
    pub doctor: Address,
    pub patient: Address,
    pub cid: String,
    pub doc_type: String,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct AccessToken {
    pub doctor: Address,
    pub patient: Address,
    pub document_id: BytesN<32>,
    pub expires_at: u64,
    pub encrypted_key: Bytes,
}

#[contracttype]
#[derive(Clone)]
pub struct AccessEvent {
    pub doctor: Address,
    pub token_id: BytesN<32>,
    pub accessed_at: u64,
}

#[contracttype]
pub enum DataKey {
    Document(BytesN<32>),
    Token(BytesN<32>),
    AuditLog(Address),
    PatientDocs(Address),
    DoctorTokens(Address),
}

fn id_from_bytes(env: &Env, data: Bytes) -> BytesN<32> {
    env.crypto().sha256(&data).into()
}

fn g1_from_bytes(env: &Env, b: &Bytes) -> soroban_sdk::crypto::bls12_381::Bls12381G1Affine {
    use soroban_sdk::crypto::bls12_381::Bls12381G1Affine;
    let arr: BytesN<96> = b.slice(0..96).try_into().unwrap_or_else(|_| BytesN::from_array(env, &[0u8; 96]));
    Bls12381G1Affine::from_bytes(arr)
}

fn g2_from_bytes(env: &Env, b: &Bytes) -> soroban_sdk::crypto::bls12_381::Bls12381G2Affine {
    use soroban_sdk::crypto::bls12_381::Bls12381G2Affine;
    let arr: BytesN<192> = b.slice(0..192).try_into().unwrap_or_else(|_| BytesN::from_array(env, &[0u8; 192]));
    Bls12381G2Affine::from_bytes(arr)
}

fn negate_g1(p: soroban_sdk::crypto::bls12_381::Bls12381G1Affine) -> soroban_sdk::crypto::bls12_381::Bls12381G1Affine {
    -p
}

#[contract]
pub struct MedVaultContract;

#[contractimpl]
impl MedVaultContract {
    pub fn register_document(
        env: Env,
        doctor: Address,
        patient: Address,
        cid: String,
        doc_type: String,
    ) -> BytesN<32> {
        doctor.require_auth();

        let created_at = env.ledger().timestamp();
        let doc_id = id_from_bytes(&env, cid.to_bytes());

        let doc = Document {
            doctor: doctor.clone(),
            patient: patient.clone(),
            cid,
            doc_type,
            created_at,
        };

        env.storage().persistent().set(&DataKey::Document(doc_id.clone()), &doc);

        let mut docs: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::PatientDocs(patient.clone()))
            .unwrap_or(vec![&env]);
        docs.push_back(doc_id.clone());
        env.storage().persistent().set(&DataKey::PatientDocs(patient), &docs);

        doc_id
    }

    pub fn grant_access(
        env: Env,
        patient: Address,
        doctor: Address,
        document_id: BytesN<32>,
        expires_at: u64,
        encrypted_key: Bytes,
    ) -> BytesN<32> {
        patient.require_auth();

        let doc_bytes: Bytes = document_id.clone().into();
        let exp_bytes = Bytes::from_slice(&env, &expires_at.to_be_bytes());
        let mut combined = Bytes::new(&env);
        combined.append(&doc_bytes);
        combined.append(&exp_bytes);
        let token_id = id_from_bytes(&env, combined);

        let token = AccessToken {
            doctor: doctor.clone(),
            patient,
            document_id,
            expires_at,
            encrypted_key,
        };
        env.storage().temporary().set(&DataKey::Token(token_id.clone()), &token);

        let ttl_seconds = expires_at.saturating_sub(env.ledger().timestamp());
        let ttl_ledgers = ((ttl_seconds / 5) as u32).saturating_add(120);
        env.storage()
            .temporary()
            .extend_ttl(&DataKey::Token(token_id.clone()), ttl_ledgers, ttl_ledgers);

        let mut doctor_tokens: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::DoctorTokens(doctor.clone()))
            .unwrap_or(vec![&env]);
        doctor_tokens.push_back(token_id.clone());
        env.storage().persistent().set(&DataKey::DoctorTokens(doctor), &doctor_tokens);

        token_id
    }

    pub fn verify_access(env: Env, token_id: BytesN<32>, doctor: Address) -> bool {
        let token: Option<AccessToken> = env.storage().temporary().get(&DataKey::Token(token_id));
        match token {
            None => false,
            Some(t) => t.doctor == doctor && env.ledger().timestamp() < t.expires_at,
        }
    }

    pub fn log_access(env: Env, doctor: Address, token_id: BytesN<32>, patient: Address) {
        doctor.require_auth();

        let event = AccessEvent {
            doctor,
            token_id,
            accessed_at: env.ledger().timestamp(),
        };
        let mut log: Vec<AccessEvent> = env
            .storage()
            .persistent()
            .get(&DataKey::AuditLog(patient.clone()))
            .unwrap_or(vec![&env]);
        log.push_back(event);
        env.storage().persistent().set(&DataKey::AuditLog(patient), &log);
    }

    pub fn get_audit_log(env: Env, patient: Address) -> Vec<AccessEvent> {
        env.storage().persistent().get(&DataKey::AuditLog(patient)).unwrap_or(vec![&env])
    }

    pub fn get_patient_documents(env: Env, patient: Address) -> Vec<BytesN<32>> {
        env.storage().persistent().get(&DataKey::PatientDocs(patient)).unwrap_or(vec![&env])
    }

    pub fn get_document(env: Env, document_id: BytesN<32>) -> Option<Document> {
        env.storage().persistent().get(&DataKey::Document(document_id))
    }

    pub fn get_token_info(env: Env, token_id: BytesN<32>) -> Option<AccessToken> {
        env.storage().temporary().get(&DataKey::Token(token_id))
    }

    pub fn get_encrypted_key(env: Env, token_id: BytesN<32>) -> Option<Bytes> {
        let token: Option<AccessToken> = env.storage().temporary().get(&DataKey::Token(token_id));
        token.map(|t| t.encrypted_key)
    }

    pub fn verify_zkp_proof(
        env: Env,
        merkle_root: BytesN<32>,
        proof_a: Bytes,
        proof_b: Bytes,
        proof_c: Bytes,
        ic_0: Bytes,
        ic_1: Bytes,
        alpha_g1: Bytes,
        beta_g2: Bytes,
        gamma_g2: Bytes,
        delta_g2: Bytes,
    ) -> bool {
        // Groth16 verification via Stellar BLS12-381 pairing (CAP-0052)
        // e(-A, B) * e(alpha, beta) * e(L, gamma) * e(C, delta) == GT_identity
        // L = IC[0] + root * IC[1]
        use soroban_sdk::crypto::bls12_381::Bls12381Fr;

        let root_fr = Bls12381Fr::from_bytes(merkle_root);

        let ic_0_g1 = g1_from_bytes(&env, &ic_0);
        let ic_1_g1 = g1_from_bytes(&env, &ic_1);

        let bls = env.crypto().bls12_381();
        let root_contribution = bls.g1_mul(&ic_1_g1, &root_fr);
        let l_g1 = bls.g1_add(&ic_0_g1, &root_contribution);

        let proof_a_g1 = g1_from_bytes(&env, &proof_a);
        let proof_b_g2 = g2_from_bytes(&env, &proof_b);
        let proof_c_g1 = g1_from_bytes(&env, &proof_c);

        let neg_a = negate_g1(proof_a_g1);

        let alpha_g1_pt = g1_from_bytes(&env, &alpha_g1);
        let beta_g2_pt  = g2_from_bytes(&env, &beta_g2);
        let gamma_g2_pt = g2_from_bytes(&env, &gamma_g2);
        let delta_g2_pt = g2_from_bytes(&env, &delta_g2);

        let g1s = soroban_sdk::vec![&env, neg_a, alpha_g1_pt, l_g1, proof_c_g1];
        let g2s = soroban_sdk::vec![&env, proof_b_g2, beta_g2_pt, gamma_g2_pt, delta_g2_pt];

        env.crypto().bls12_381().pairing_check(g1s, g2s)
    }

    pub fn get_doctor_tokens(env: Env, doctor: Address) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::DoctorTokens(doctor))
            .unwrap_or(vec![&env])
    }

    pub fn revoke_access(env: Env, patient: Address, token_id: BytesN<32>) {
        patient.require_auth();

        let token: Option<AccessToken> = env
            .storage()
            .temporary()
            .get(&DataKey::Token(token_id.clone()));
        if let Some(t) = token {
            if t.patient == patient {
                env.storage().temporary().remove(&DataKey::Token(token_id));
            }
        }
    }
}
