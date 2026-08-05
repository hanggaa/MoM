# 📋 Executive Summary
The team conducted a technical alignment session covering production deployment scheduling, system architecture decisions for service consolidation, document upload workflow refinements, and payment gateway (PKN) integration logic. Key decisions include enforcing a single-service ownership model via "Pakman flag" configuration, standardizing dual-record upload flows from VK, and configuring PKN balance handling to favor settlement over immediate deduction. The session resolved immediate blockers for the upcoming production push targeting a 20-unit deployment batch.

# 💬 Discussion Highlights & Key Decisions
- **Architecture Consolidation**: Confirmed move toward **single-service ownership** ("satu layanan, satu sakannya") to eliminate cross-service dependencies; `Pakman flag` will gate inquiry status routing to prevent duplicate processing.
- **Production Scheduling**: Agreed to batch **20 units per production run** (up from 10) to optimize throughput; deployment window tentatively set for **09:00** daily.
- **Document Upload Flow**: Standardized **dual-record upload** from VK (post-transaction + reconciliation records); first record captures transaction completion, second handles aliquot/settlement verification.
- **PKN Payment Logic**: Decided **balance deduction favors settlement flow** ("disekot") over instant deduction; implementation to support both modes with configuration toggle.
- **Feature Flag Strategy**: `Pakman flag` to control inquiry status visibility—once enabled, legacy inquiry paths deprecated.
- **YOD (Year-End/Date) Processing**: Clarified prerequisite data population required before YOD execution; manual intervention needed if source data missing.

# ⚡ Action Items & Ownership
| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority (High / Med / Low) |
|---|---|---|---|
| Implement `Pakman flag` gating for inquiry status routing & deprecate legacy paths | Backend Lead (assumed: "Pakman" owner) | Next Sprint (TBD - Action Required) | High |
| Configure production scheduler for 20-unit batch deployment at 09:00 | DevOps / Release Engineer | Pre-prod validation by EOW | High |
| Develop dual-record VK upload pipeline (transaction + reconciliation) | Integration Engineer | Before next production push | High |
| Build PKN settlement toggle (instant deduction vs. batch settlement) | Payments Engineer | Sprint + 1 | Medium |
| Document YOD prerequisite data checklist & manual fallback procedure | QA / Docs Owner | Immediate (TBD - Action Required) | Medium |
| Validate "Ardu/Rotech" hardware integration status for video pipeline | Hardware/Embedded Lead | Next standup | Low |

# ⚠️ Risks, Constraints & Open Questions
- **PKN Integration Ambiguity**: Settlement vs. deduction logic requires explicit contract confirmation with PKN vendor; current assumption ("kebasannya") unverified.
- **Single-Service Migration Risk**: Consolidation to "satu sakannya" may introduce single-point-of-failure; rollback plan undocumented.
- **VK Upload Idempotency**: Dual-record flow lacks deduplication strategy for network retries; potential duplicate ledger entries.
- **YOD Data Dependency**: Manual data population step creates human-error surface; automation backlog item not yet scoped.
- **Hardware/Ardu Stability**: References to "Ardu/Rotech" suggest IoT/edge component; no health monitoring discussed.
- **Timeline Pressure**: 20-unit batch target assumes current CI/CD throughput; no load-test data presented.