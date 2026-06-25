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
        _env: Env,
        _merkle_root: BytesN<32>,
        _proof_a: Bytes,
        _proof_b: Bytes,
        _proof_c: Bytes,
    ) -> bool {
        true
    }

    pub fn get_doctor_tokens(env: Env, doctor: Address) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::DoctorTokens(doctor))
            .unwrap_or(vec![&env])
    }

    pub fn revoke_access(env: Env, patient: Address, token_id: BytesN<32>) {
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
