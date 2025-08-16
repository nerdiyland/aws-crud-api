# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning Strategy

This package follows a synchronized versioning approach with AWS CDK:
- **Major versions** align with AWS CDK major versions
- **Minor/patch versions** follow semantic versioning for features and fixes
- **CDK version parity**: When new AWS CDK versions are released, this package is automatically updated to match

## [Unreleased]

### Added
- Initial open source release
- Comprehensive documentation and examples
- TypeScript support with full type definitions

## [1.0.0] - 2024-08-16

### Added
- Complete CRUD API construct for AWS CDK
- Support for DynamoDB-backed CRUD operations
- Optional S3 integration for large objects
- AWS IoT Core event dispatching
- Owner-based access control with field-level security
- Team-based permissions (optional)
- Parent-child resource hierarchies
- Comprehensive API Gateway integration
- Lambda function backend with AWS PowerTools logging
- Full TypeScript support and type definitions
- Multiple operation types: Create, Read, List, ListOwned, Update, Delete
- Configurable security models
- S3 field configuration for large data storage
- Event system for real-time notifications

### Infrastructure
- API Gateway REST API with validation
- Lambda functions for CRUD operations
- DynamoDB tables with GSI support
- S3 bucket integration (optional)
- IoT Core topic publishing (optional)
- IAM roles and policies

### Documentation
- Complete README with installation and usage guides
- API reference documentation
- Architecture documentation with design decisions
- Working examples and tutorials
- Troubleshooting guides

### Examples
- Simple tasks API example
- Blog API with security configurations
- E-commerce product catalog example

## [0.x.x] - Pre-release versions

Previous versions were internal development releases and are not documented here.

---

## Release Notes

### Upcoming Features
- GraphQL support
- Advanced caching with Redis
- Batch operations
- Search integration with OpenSearch
- Audit logging capabilities

### Migration Guides

When upgrading between major versions, please refer to the migration guides:
- [Migrating to v2.x](docs/migrations/v2.md) (when available)
- [Migrating to v1.x](docs/migrations/v1.md) (current)

### CDK Compatibility

| Package Version | CDK Version | Node.js |
|----------------|-------------|---------|
| 1.x.x          | ^2.0.0      | >=16.0.0|

### Breaking Changes

This project follows semantic versioning. Breaking changes will be clearly documented in major version releases.

### Security

For security-related changes and vulnerability fixes, see the [Security Policy](SECURITY.md).
