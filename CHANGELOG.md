# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased
### Changed
- Instead of reading types by re-parsing downloaded SHACL files, the GraphQL Schema file is now used as input.

### Added
- Test cases for GraphQLSchema class read from a GQL Schema file.

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
