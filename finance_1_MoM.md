# 📋 Executive Summary
The Finance-1 meeting centered on reviewing outstanding loan receivables, payment term structures, and associated legal-compliance risks. Key discussion points included aging receivables totaling ~IDR 6.4B (notably from May and February cycles), the absence of a formal penalty framework for late payments (currently 35–45 days standard, stretching to 60–90 days), and the need to validate whether current collection workflows expose the organization to legal loopholes. The team agreed to formalize penalty clauses, tighten credit-term enforcement, and initiate a legal review of the end-to-end lending process.

# 💬 Discussion Highlights & Key Decisions
- **Receivables Aging & Exposure**: Outstanding principal of **IDR 6.4B** identified in the May batch (originating from February), with a significant portion still uncollected. Root cause attributed to habitual late-payment behavior rather than disputes.
- **Payment Terms & Penalty Gap**: Standard terms are 35–45 days; however, actual collections frequently extend to 60–90 days. **No automated penalty/late-fee mechanism exists** in the current system—confirmed as a critical control weakness.
- **Legal-Compliance Review**: Explicit concern raised on potential *celah hukum* (legal loopholes) in the lending/collection flow. Decision: **Engage Legal to audit current contracts, collection SOPs, and system-enforced terms** before next disbursement cycle.
- **Pricing & Margin Transparency**: Discussion on “harga 2-9” (2–9% margin band) and the need to surface true cost-to-serve vs. headline price in the front-end UI so sales/ops can justify terms during negotiation.
- **System/UI Enhancements**: Agreement to surface aging buckets, penalty calculators, and real-time legal-flag indicators in the collections dashboard (UI) to prevent manual workarounds.
- **Process Standardization**: Move from ad-hoc “gentleman’s agreement” extensions to **system-enforced term limits** with automated escalation at T+45 days.

# ⚡ Action Items & Ownership
| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority (High / Med / Low) |
|---|---|---|---|
| Compile full aging report (IDR 6.4B + other buckets) with root-cause tags | Finance Analytics Lead | 3 business days | High |
| Draft penalty/late-fee schedule (tiered: 15/30/45/60 days) for Legal review | Credit Policy Owner | 5 business days | High |
| Legal audit of loan agreements, collection SOPs, and system workflows | Legal Counsel / Compliance | 10 business days | High |
| Implement penalty-engine config in core lending system (calc, posting, notification) | Engineering / Core Banking Squad | 4 weeks (sprint-aligned) | High |
| Enhance Collections Dashboard: aging buckets, penalty preview, legal-flag column | Product / UI Team | 3 weeks | Medium |
| Define escalation matrix (auto-email → call → legal letter) at T+45, T+60, T+90 | Collections Ops Lead | 1 week | Medium |
| Socialize new terms & penalty framework to Sales/Relationship Managers | Sales Enablement | 2 weeks post-Legal sign-off | Medium |
| Validate “harga 2-9” margin waterfall model & publish internal pricing playbook | Pricing / Finance BP | 2 weeks | Low |

# ⚠️ Risks, Constraints & Open Questions
- **Legal Exposure**: Current contracts may not support unilateral penalty imposition; retrospective application could trigger disputes. *Legal sign-off required before system go-live.*
- **System Rigidity**: Core lending platform may lack configurable penalty engine; custom development could delay launch by 2–3 sprints.
- **Data Integrity**: Aging report relies on manual extracts; risk of misstated exposure until automated feed is validated.
- **Sales Pushback**: Relationship teams may resist stricter terms fearing client attrition—change-management plan needed.
- **Open Question**: Should penalty revenue be recognized as income or contra-receivable? *Accounting policy decision pending.*
- **Open Question**: Threshold for legal-action referral (e.g., >IDR 500M & >90 dpd)? *Requires Risk Committee alignment.*