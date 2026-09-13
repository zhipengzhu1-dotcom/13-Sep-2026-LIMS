# How existing LIMS model roles/permissions, and do any enforce reviewer ≠ analyst structurally?

**Asked by:** Orchestrator, follow-on to the closed SENAITE data-model/API ticket
**Date:** 2026-09-11
**Status of sources:** Read directly from a fresh shallow clone of `senaite/senaite.core` (commit `993f721e6d8494d94a4001cd3d73409504b67a49`, cloned 2026-09-11, tip of `master` at that time — treat as "current master," not a numbered release tag; I did not check out a specific tagged release). Read directly from a fresh shallow clone of `DIGI-UW/OpenELIS-Global-2` (commit `672c92a618f8ad146560846eacafb0e0a4178068`, branch `develop`, cloned 2026-09-11). NIST pages fetched live on 2026-09-11: `csrc.nist.gov/projects/role-based-access-control/faqs` and `csrc.nist.gov/pubs/sp/800/162/upd2/final` (confirmed via page metadata this is SP 800-162, dated January 2014, "includes updates as of 08-02-2019" — i.e. the upd2/final version supersedes upd1 of 02/25/2019; this is the current NIST ABAC guide, not a withdrawn draft). I did not attempt to check the December 2018 FDA data-integrity guidance or NIST HB 150 for this question — they are not relevant to it.

## Findings

### 1. SENAITE's role and permission model

**Roles (out of the box).** `senaite.core`'s global role map lists these SENAITE-specific roles, verified verbatim from source:

```
<role name="Analyst"/>
<role name="Client"/>
<role name="LabClerk"/>
<role name="LabManager"/>
<role name="Preserver"/>
<role name="Publisher"/>
<role name="RegulatoryInspector"/>
<role name="Sampler"/>
<role name="SamplingCoordinator"/>
<role name="Verifier"/>
```
— `bika/lims/profiles/default/rolemap.xml` (senaite.core, master @ 993f721e). Plone's own base roles (Manager, Owner, Member, Reviewer, Editor, Contributor, Reader, Authenticated, Anonymous, Site Administrator) are also present in the same file and are inherited machinery, not SENAITE's invention.

**Global vs. per-object (local) roles.** Both mechanisms are used, for different purposes:
- Global role→permission mapping is done in `rolemap.xml` (e.g. "View", "Modify portal content", "Manage users" are granted to named roles globally, with `acquire="True"`), refined per content type and per workflow state in the per-type workflow definitions under `bika/lims/profiles/default/workflows/` (confirmed by the PR description of senaite/senaite.core#1237, "Global Permission and Role Mappings refactoring," which states permissions are set globally in rolemap.xml and then acquired per-role in the workflow).
- Plone's local-role (`sharing`) mechanism is also used, but for client-portal object ownership, not for lab review workflow: `contact.py:308` calls `sec_api.grant_local_roles_for(self, roles=["Owner"], user=user)` when linking a Contact to a user account, and `contact.py:347` revokes it (`revoke_local_roles_for`). — `bika/lims/content/contact.py:308,347`.

**Is a role a flat name, or does it carry attributes? Is there per-method/per-service user qualification?**
A role in SENAITE's rolemap is a flat string name with no attached attributes — it is Zope/Plone's plain role primitive. I searched `abstractbaseanalysis.py` (the base analysis-service content type) and `labcontact.py` (the lab-personnel content type) for any field that associates a specific user/contact with qualification for a specific method or analysis service, and found none. There is an `InstrumentCertification` content type (`bika/lims/content/instrumentcertification.py`) that certifies an **instrument** against a method, but nothing analogous certifying a **person**. **I could not establish that SENAITE core has a "user qualified for method X" data model** — assignment of an analyst to an analysis is done via the `Analyst` field/role on the analysis and worksheet (`abstractanalysis.py:1208 getAnalyst`), which records who did the work, not who is credentialed to do it. This may exist in a separate add-on package I did not check.

**Self-verification.** This is exactly the mechanism the question describes, and it is a config toggle, not a structural role separation:
- Site-wide default, `SelfVerificationEnabled` (`BooleanField`, default `False`), stored on the lab setup object: `bika/lims/content/bikasetup.py:485-499`. Doc string: *"If enabled, a user who submitted a result will also be able to verify it. This setting only take effect for those users with a role assigned that allows them to verify results (by default, managers, labmanagers and verifiers). This setting can be overrided for a given Analysis in Analysis Service edit view. By default, disabled."*
- Per-analysis-service override, `SelfVerification` (`IntegerField`, default `-1` = "use system default"; `bika/lims/content/abstractbaseanalysis.py:814-829`), with the code comment: *"Permit a user to verify their own results. This could invalidate the accreditation for the results of this analysis!"*
- Effective check, `isSelfVerificationEnabled()` (`abstractbaseanalysis.py:1071-1078`):
  ```python
  def isSelfVerificationEnabled(self):
      bsve = self.bika_setup.getSelfVerificationEnabled()
      vs = self.getSelfVerification()
      return bsve if vs == -1 else vs == 1
  ```
- The actual guard that consults this, in the workflow transition guards (`bika/lims/workflow/analysis/guards.py:191-227`):
  ```python
  def was_submitted_by_current_user(analysis):
      return analysis.getSubmittedBy() == api.get_current_user().getId()
  ...
  # Cannot verify if the user submitted and self-verification is not allowed
  if was_submitted_by_current_user(analysis):
      if not analysis.isSelfVerificationEnabled():
          return False
  ```
  This is a **same-user identity check** (`getSubmittedBy() == current user id`), not a same-role check — i.e. it does not ask "is this person a Verifier and an Analyst simultaneously," it asks "is this literally the account that submitted this specific result." It is enforced as a workflow-transition guard (`guard_verify`, `guard_multi_verify`), so it is a per-transition, per-analysis check evaluated at the moment of the verify action, gated by a global (or per-service-override) setting rather than a per-user setting.

**Multi-verification and its interaction with self-verification.** SENAITE also has:
- `NumberOfRequiredVerifications` (default `1`) — `bikasetup.py:503-518`: *"Number of required verifications before a given result being considered as 'verified'... By default, 1."*
- `TypeOfmultiVerification` (default `'self_multi_enabled'`) — `bikasetup.py:521-530`, a vocabulary (`MULTI_VERIFICATION_TYPE`) with at least the values `self_multi_enabled`, `self_multi_not_cons`, `self_multi_disabled` (inferred from the guard code below; I did not locate the full vocabulary definition to confirm there are no other values).
- The guards compose these three settings (`guards.py:181-260`):
  ```python
  def is_multi_verification_allowed(analysis):
      multi_type = api.get_senaite_setup().getTypeOfmultiVerification()
      return multi_type != "self_multi_disabled"

  def is_consecutive_multi_verification_allowed(analysis):
      multi_type = api.get_senaite_setup().getTypeOfmultiVerification()
      return multi_type != "self_multi_not_cons"
  ```
  and `guard_multi_verify`/`guard_verify` check, in order: (a) whether enough verifications remain to require multi-verify at all, (b) whether the current user was the submitter and self-verification is disabled, (c) whether the current user already verified once and multi-verification-by-the-same-user is disabled, (d) whether the current user was the *immediately preceding* verifier and consecutive-same-user re-verification is disabled. All of these are identity checks against the recorded actor of prior workflow transitions, not role checks.

**Deactivation and historical attribution.** SENAITE does not delete lab-personnel accounts; a `LabContact` (linked 1:1 to a Plone/Zope user account) has an `active`/`inactive` workflow state with `activate`/`deactivate` transitions guarded by role (`LabManager`/`Manager` only) — `src/senaite/core/profiles/default/workflows/senaite_labcontact_workflow/definition.xml`. The login-details template explicitly states the deactivated user's link is retained: *"Contact is deactivated. User cannot be unlinked."* — `bika/lims/browser/templates/login_details.pt:119`. Historical attribution (who submitted, who verified) is derived from Zope's/Plone's workflow **review history**, not from a live foreign key to the user object: `getSubmittedBy()` calls `getTransitionActor(self, 'submit')` (`abstractanalysis.py:1227-1233`), and `getVerificators()` walks `api.get_review_history(self, rev=False)` collecting the `actor` field of every event whose resulting state was `"verified"` (`abstractanalysis.py:348-357`). Because this is an immutable append-only history of past transitions, deactivating (or even fully removing) the user account does not itself alter the recorded actor ID on past analyses — but I could not find, and did not have time to test, what the UI subsequently *displays* for a review-history actor whose user account no longer exists (e.g. whether it falls back to the raw ID or shows a broken lookup). Flagged as unverified.

### 2. Other reference points

**OpenELIS Global** (`DIGI-UW/OpenELIS-Global-2`, `develop` @ `672c92a6`, Java/Spring): I searched the full source tree for any mechanism resembling structural or even convention-based self-review prevention (patterns: "self review", "same analyst/user", "separation of dut[y/ies]") and found no hits in application code — the only hits were an unrelated project-planning checklist document and an `ElectronicSignatureServiceImpl.java` comment about session-based signing-count concurrency, which is about serializing counters per username, not about preventing a user from reviewing their own result. **I could not establish that OpenELIS Global has a self-review restriction, structural or conventional, from the source tree alone**, and I did not find primary documentation (vs. secondary marketing pages) enumerating its role list with enough specificity to cite responsibly — the DIGI Wiki and openelis-global.org pages describe "role-based" access at a marketing level without a canonical role enumeration or workflow-guard-level detail comparable to what I found in SENAITE's source. This is a gap, not a finding of absence: OpenELIS's role/security tables are configured in the application database (Liquibase changesets) rather than committed as a single readable enumeration, and I did not have time to trace the full changeset history to build that list reliably. I am reporting this as unverified rather than guessing at role names.

**Other commercial LIMS:** I did not find reachable, citable primary documentation (vendor's own docs, not third-party writeups) making an explicit, quotable statement of a self-review rule for any commercial LIMS in the time available. I am not reporting anything from memory or from secondary sources for this part of the question.

### 3. RBAC, ABAC, and separation of duty — NIST sources

**RBAC.** NIST's own RBAC project page states role-based access control's core idea: a role is a collection of permissions, and users receive permissions only through roles they are assigned (csrc.nist.gov/projects/role-based-access-control/faqs, retrieved 2026-09-11). The formal reference model is ANSI/INCITS 359-2004 ("Role Based Access Control"), the standard produced from NIST's proposed unified RBAC model. That standard defines four components: **Core RBAC** (required), **Hierarchical RBAC**, and **Constrained RBAC**, with Constrained RBAC comprising **Static Separation of Duty (SSD)** and **Dynamic Separation of Duty (DSD)** relations. Per the NIST RBAC FAQ, Core RBAC is required in any conformant system, while the other components (hierarchy, SSD, DSD) "are independent of each other and may be implemented separately" — i.e. **both SSD and DSD are standard, named components of the reference model, not one-off proprietary extensions, but neither is mandatory for baseline conformance.**

- **Static Separation of Duty (SSD):** prevents a single user from being *assigned* to a combination of roles that together would create a conflict of interest (e.g. holding both a "requestor" and an "approver" role at all), enforced at role-assignment time.
- **Dynamic Separation of Duty (DSD):** constrains which roles a user may *activate simultaneously in one session*, even if the user is separately entitled to hold conflicting roles — this is the closer analogue to "may not review what you performed," since it is evaluated at the point of use/session rather than at the point of grant. The formal statement (as commonly rendered from the standard): DSD is a set of pairs (role-set, cardinality n ≥ 2) such that no user may have n or more of those roles simultaneously active in a session.

I was not able to fetch the ANSI/INCITS 359-2004 standard text itself (it is a paid ANSI standard, not freely hosted); the definitions above are drawn from NIST's own RBAC FAQ page, which is NIST's authoritative public restatement of the model it co-authored, and from the publicly mirrored 2003 candidate draft (xml.coverpages.org) that preceded the 2004 ANSI publication — I am flagging that the coverpages document is a *pre-publication draft*, not the final ANSI standard, so I am treating the NIST FAQ page as the primary citation and the draft only as corroboration of terminology, not as the authoritative text.

**ABAC.** NIST SP 800-162, *Guide to Attribute Based Access Control (ABAC) Definition and Considerations*: definition quoted directly from the current version (csrc.nist.gov/pubs/sp/800/162/upd2/final, page metadata confirms "Date Published: January 2014 (includes updates as of 08-02-2019)," superseding the prior upd1 of 02/25/2019 — this is the current version, verified by checking the publication's own "Supersedes" field, not merely a search-result ranking): *"ABAC is a logical access control methodology where authorization to perform a set of operations is determined by evaluating attributes associated with the subject, object, requested operations, and, in some cases, environment conditions against policy, rules, or relationships that describe the allowable operations for a given set of attributes."*

SP 800-162 does not itself use the terms "static/dynamic separation of duty" as headline defined terms in the excerpt I could retrieve via fetch (ABAC's attribute-combination rules can express the same effect — e.g. an attribute rule that a "reviewer" attribute must differ from the "performer" attribute recorded on the object — but I could not confirm SP 800-162 names this pattern explicitly as "separation of duty" anywhere in the document; I did not do a full-text pass of the PDF, only a targeted fetch, so this is flagged as unconfirmed rather than asserted absent).

## What I could not establish

- Whether SENAITE core has any data model for qualifying a specific user for a specific analysis method/service (I found none in the core content types I checked; may exist in an add-on).
- What SENAITE's UI does with a review-history "actor" reference once the corresponding user account is deactivated or deleted (the underlying data is retained per the workflow history mechanism, but display/resolution behavior for a missing account was not traced).
- The complete `MULTI_VERIFICATION_TYPE` vocabulary for `TypeOfmultiVerification` beyond the three values inferable from the guard code (`self_multi_enabled`, `self_multi_not_cons`, `self_multi_disabled`).
- OpenELIS Global's canonical role enumeration and any self-review policy — the source tree shows no hits for the relevant patterns, but I could not build a reliable role list from primary sources (its role/permission configuration lives in database changesets I did not fully trace) in the time available, and did not want to report vendor-marketing text as if it were a role model.
- Any commercial LIMS vendor's own documentation stating a self-review rule explicitly — none found via reachable primary sources in the time available.
- Whether NIST SP 800-162 itself uses the term "separation of duty" (static or dynamic) anywhere in its full text; only a targeted fetch was performed, not a full-text search of the PDF.
- I did not verify the exact SENAITE release/tag this maps to; I read the tip of `master` as of 2026-09-11 (commit `993f721e`), which may differ in minor respects from the latest tagged release.

## Sources

- `senaite/senaite.core`, GitHub, commit `993f721e6d8494d94a4001cd3d73409504b67a49` (master, cloned 2026-09-11):
  - `bika/lims/profiles/default/rolemap.xml`
  - `bika/lims/content/abstractbaseanalysis.py` (lines ~800-830, ~1060-1100)
  - `bika/lims/content/bikasetup.py` (lines ~475-530, ~1790-1845)
  - `bika/lims/workflow/analysis/guards.py` (lines ~150-260, 313-352)
  - `bika/lims/content/contact.py` (lines 308, 347)
  - `bika/lims/content/abstractanalysis.py` (lines 348-357, 1208, 1227-1233)
  - `bika/lims/browser/templates/login_details.pt` (line 119)
  - `src/senaite/core/profiles/default/workflows/senaite_labcontact_workflow/definition.xml`
  - `src/senaite/core/upgrade/v02_07_000.py` (line 1727, confirms `SelfVerificationEnabled` field lineage)
  - Pull request senaite/senaite.core#1237, "Global Permission and Role Mappings refactoring" (github.com/senaite/senaite.core/pull/1237), used only to corroborate how rolemap.xml and workflow-level role mapping relate — a maintainer PR description, not final documentation; treat as corroborating, not authoritative.
- `DIGI-UW/OpenELIS-Global-2`, GitHub, commit `672c92a618f8ad146560846eacafb0e0a4178068` (develop, cloned 2026-09-11) — full-tree grep for self-review / separation-of-duty patterns.
- NIST, "Role Based Access Control (RBAC), FAQs," https://csrc.nist.gov/projects/role-based-access-control/faqs, retrieved 2026-09-11.
- ANSI/INCITS 359-2004 candidate draft (pre-publication, 2003), https://xml.coverpages.org/NCITS-NIST-RBAC-Candidate.pdf — used only as corroboration of SSD/DSD terminology, not as the authoritative final standard text (which is a paid ANSI publication I did not access).
- NIST Special Publication 800-162, *Guide to Attribute Based Access Control (ABAC) Definition and Considerations*, current version (upd2), published January 2014, updated 2019-08-02, https://csrc.nist.gov/pubs/sp/800/162/upd2/final, retrieved 2026-09-11; supersession confirmed against https://csrc.nist.gov/pubs/sp/800/162/upd1/final (02/25/2019, superseded).
