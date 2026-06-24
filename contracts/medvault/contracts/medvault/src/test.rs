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
