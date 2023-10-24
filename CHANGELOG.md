# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 1.0.0-beta.18 - 2023-10-24

## 1.0.0-beta.17 - 2023-10-24

## 1.0.0-beta.16 - 2023-10-23

## 1.0.0-beta.15 - 2023-10-23

## 1.0.0-beta.14 - 2023-10-23

## 1.0.0-beta.13 - 2023-10-23

## 1.0.0-beta.12 - 2023-10-23

## 1.0.0-beta.11 - 2023-07-12
### Added
- Client-credentials support for css pods

### Changed
- Removed axios dependency in favor of the built-in Fetch API

## 1.0.0-beta.10 - 2023-06-27

## 1.0.0-beta.9 - 2023-06-21

## 1.0.0-beta.8 - 2023-06-21

## 1.0.0-beta.7 - 2023-06-20
### Added
- Test cases for GraphQLSchema class read from a GQL Schema file.

### Changed
- Instead of reading types by re-parsing downloaded SHACL files, the GraphQL Schema file is now used as input.

### Removed
- Logger library typescript-logging removed, since it was not being used yet.
- The SHACLReaderService since this is no longer needed.
- The SHACLReader test cases since the SHACLReaderService is removed.

## 1.0.0-beta.6 - 2023-05-03
### Added
- GraphQL query execution support.
- GraphQL mutation execution support.
- Support for Document and Container resource types.
- Tests for GraphQL Schema generation.
- Tests for GraphQL Schema execution.
- Tests for SolidLDPContext construction.

## 1.0.0-beta.5 - 2023-04-13
### Added
- Changelog
