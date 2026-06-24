#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, vec, Address, BytesN, Env, String, Vec,
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
        let doc_id: BytesN<32> = env.crypto().sha256(
            &soroban_sdk::Bytes::from_slice(&env, &{
                let mut raw = [0u8; 32];
                let ts = created_at.to_be_bytes();
                raw[..8].copy_from_slice(&ts);
                raw
            }),
        ).into();

        let doc = Document {
            doctor: doctor.clone(),
            patient: patient.clone(),
            cid,
            doc_type,
            created_at,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Document(doc_id.clone()), &doc);

        let mut docs: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::PatientDocs(patient.clone()))
            .unwrap_or(vec![&env]);

        docs.push_back(doc_id.clone());

        env.storage()
            .persistent()
            .set(&DataKey::PatientDocs(patient), &docs);

        doc_id
    }

    pub fn grant_access(
        env: Env,
        patient: Address,
        doctor: Address,
        document_id: BytesN<32>,
        expires_at: u64,
    ) -> BytesN<32> {
        patient.require_auth();

        let token_id: BytesN<32> = env.crypto().sha256(
            &soroban_sdk::Bytes::from_slice(&env, &{
                let mut raw = [0u8; 32];
                let ts = env.ledger().timestamp().to_be_bytes();
                raw[..8].copy_from_slice(&ts);
                raw[8..16].copy_from_slice(&expires_at.to_be_bytes());
                raw
            }),
        ).into();

        let token = AccessToken {
            doctor,
            patient,
            document_id,
            expires_at,
        };

        env.storage()
            .temporary()
            .set(&DataKey::Token(token_id.clone()), &token);

        token_id
    }

    pub fn verify_access(env: Env, token_id: BytesN<32>, doctor: Address) -> bool {
        let token: Option<AccessToken> = env
            .storage()
            .temporary()
            .get(&DataKey::Token(token_id));

        match token {
            None => false,
            Some(t) => {
                if t.doctor != doctor {
                    return false;
                }
                env.ledger().timestamp() < t.expires_at
            }
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

        env.storage()
            .persistent()
            .set(&DataKey::AuditLog(patient), &log);
    }

    pub fn get_audit_log(env: Env, patient: Address) -> Vec<AccessEvent> {
        patient.require_auth();

        env.storage()
            .persistent()
            .get(&DataKey::AuditLog(patient))
            .unwrap_or(vec![&env])
    }

    pub fn get_patient_documents(env: Env, patient: Address) -> Vec<BytesN<32>> {
        patient.require_auth();

        env.storage()
            .persistent()
            .get(&DataKey::PatientDocs(patient))
            .unwrap_or(vec![&env])
    }

    pub fn get_document(env: Env, document_id: BytesN<32>) -> Option<Document> {
        env.storage()
            .persistent()
            .get(&DataKey::Document(document_id))
    }

    pub fn get_token_info(env: Env, token_id: BytesN<32>) -> Option<AccessToken> {
        env.storage()
            .temporary()
            .get(&DataKey::Token(token_id))
    }
}
