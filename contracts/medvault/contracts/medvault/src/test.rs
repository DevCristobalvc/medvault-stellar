#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::Env;

fn setup() -> (Env, MedVaultContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MedVaultContract, ());
    let client = MedVaultContractClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn test_register_document() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor,
        &patient,
        &String::from_str(&env, "QmTestCID123"),
        &String::from_str(&env, "clinical_history"),
    );

    let doc = client.get_document(&doc_id).unwrap();
    assert_eq!(doc.doctor, doctor);
    assert_eq!(doc.patient, patient);
    assert_eq!(doc.doc_type, String::from_str(&env, "clinical_history"));
}

#[test]
fn test_patient_documents_list() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    client.register_document(
        &doctor,
        &patient,
        &String::from_str(&env, "QmCID1"),
        &String::from_str(&env, "exam"),
    );
    client.register_document(
        &doctor,
        &patient,
        &String::from_str(&env, "QmCID2"),
        &String::from_str(&env, "prescription"),
    );

    let docs = client.get_patient_documents(&patient);
    assert_eq!(docs.len(), 2);
}

#[test]
fn test_grant_and_verify_access_valid() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor,
        &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id = client.grant_access(&patient, &doctor, &doc_id, &9999);

    let valid = client.verify_access(&token_id, &doctor);
    assert!(valid);
}

#[test]
fn test_verify_access_expired() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor,
        &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id = client.grant_access(&patient, &doctor, &doc_id, &500);

    let valid = client.verify_access(&token_id, &doctor);
    assert!(!valid);
}

#[test]
fn test_verify_access_wrong_doctor() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let wrong_doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor,
        &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id = client.grant_access(&patient, &doctor, &doc_id, &9999);

    let valid = client.verify_access(&token_id, &wrong_doctor);
    assert!(!valid);
}

#[test]
fn test_audit_log() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor,
        &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id = client.grant_access(&patient, &doctor, &doc_id, &9999);

    client.log_access(&doctor, &token_id, &patient);

    let log = client.get_audit_log(&patient);
    assert_eq!(log.len(), 1);
    assert_eq!(log.get(0).unwrap().doctor, doctor);
}

#[test]
fn test_audit_log_empty() {
    let (env, client) = setup();
    let patient = Address::generate(&env);

    let log = client.get_audit_log(&patient);
    assert_eq!(log.len(), 0);
}

#[test]
fn test_get_token_info_valid() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor, &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id = client.grant_access(&patient, &doctor, &doc_id, &9999);

    let info = client.get_token_info(&token_id);
    assert!(info.is_some());
    let info = info.unwrap();
    assert_eq!(info.doctor, doctor);
    assert_eq!(info.document_id, doc_id);
}

#[test]
fn test_get_token_info_nonexistent() {
    let (env, client) = setup();
    let fake_token: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);
    let info = client.get_token_info(&fake_token);
    assert!(info.is_none());
}

#[test]
fn test_revoke_access() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor, &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id = client.grant_access(&patient, &doctor, &doc_id, &9999);

    assert!(client.verify_access(&token_id, &doctor));

    client.revoke_access(&patient, &token_id);

    assert!(!client.verify_access(&token_id, &doctor));
}

#[test]
fn test_get_doctor_tokens() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor, &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id1 = client.grant_access(&patient, &doctor, &doc_id, &9999);

    env.ledger().set_timestamp(2000);
    let token_id2 = client.grant_access(&patient, &doctor, &doc_id, &99999);

    let tokens = client.get_doctor_tokens(&doctor);
    assert_eq!(tokens.len(), 2);
    assert!(tokens.contains(&token_id1));
    assert!(tokens.contains(&token_id2));
}

#[test]
fn test_get_doctor_tokens_empty() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let tokens = client.get_doctor_tokens(&doctor);
    assert_eq!(tokens.len(), 0);
}

#[test]
fn test_revoke_wrong_patient() {
    let (env, client) = setup();
    let doctor = Address::generate(&env);
    let patient = Address::generate(&env);
    let attacker = Address::generate(&env);

    let doc_id = client.register_document(
        &doctor, &patient,
        &String::from_str(&env, "QmCID"),
        &String::from_str(&env, "history"),
    );

    env.ledger().set_timestamp(1000);
    let token_id = client.grant_access(&patient, &doctor, &doc_id, &9999);

    client.revoke_access(&attacker, &token_id);

    assert!(client.verify_access(&token_id, &doctor));
}
