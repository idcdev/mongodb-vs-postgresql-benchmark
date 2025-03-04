# Language Consistency Guidelines

## Overview

This document outlines guidelines for maintaining language consistency throughout the MongoDB vs PostgreSQL Benchmark project. All documentation, code comments, commit messages, and other text should be written in English to ensure accessibility for all contributors and users.

## Identified Inconsistencies

During a review of the project, the following language inconsistencies were identified:

### Documentation Files

- ✅ `docs/architecture-plan/phase-2/README.md` - This file was originally written in Portuguese and has been translated to English.

### Commit Messages

The following commit messages were written in Portuguese:

1. `a515a04 - docs: atualizar MASTER_PLAN para corrigir inconsistências entre fases`
   - English equivalent: "docs: update MASTER_PLAN to fix inconsistencies between phases"

2. `af1a7c0 - fix: corrigir erros nos testes do ReportGenerator`
   - English equivalent: "fix: correct errors in ReportGenerator tests"

3. `788e7d2 - docs: atualizar MASTER_PLAN para refletir progresso atual do projeto`
   - English equivalent: "docs: update MASTER_PLAN to reflect current project progress"

## Actions Taken

1. Translated `docs/architecture-plan/phase-2/README.md` from Portuguese to English.
2. Created this document to track language inconsistencies and provide guidelines.
3. Conducted a thorough search of the codebase for Portuguese text in:
   - Documentation files
   - Source code files
   - Code comments
   - Commit messages

## Recommendations

1. **Documentation**: All documentation files should be written in English.

2. **Commit Messages**: All commit messages should be written in English, following the [Conventional Commits](https://www.conventionalcommits.org/) format.

3. **Code Comments**: All code comments should be written in English.

4. **Variable Names and Identifiers**: All variable names, function names, and other identifiers should use English words.

5. **Pull Request Descriptions**: All pull request descriptions and discussions should be in English.

## Handling Existing Inconsistencies

For existing commit messages in Portuguese, there's no need to rewrite history. However, all future commits should follow the English language guidelines.

## Language Review Process

Before merging significant documentation changes or code with extensive comments, consider having another team member review the language for clarity and consistency.

## Conclusion

Maintaining language consistency throughout the project improves collaboration, reduces confusion, and ensures that all contributors can understand and participate in the development process regardless of their native language.

## Summary of Review (2024-03-10)

A comprehensive review of the project's language consistency revealed:

1. **Documentation**: One file (`docs/architecture-plan/phase-2/README.md`) was found to be entirely in Portuguese and has been translated to English.

2. **Commit Messages**: Three commit messages were identified as being in Portuguese. These have been documented for reference, but no action was taken to modify the git history.

3. **Source Code**: No Portuguese text was found in source code files, including comments, variable names, or function names.

4. **Current Status**: After the translation of the Phase 2 README, all project documentation and code is now in English, establishing a consistent language standard for the project. 