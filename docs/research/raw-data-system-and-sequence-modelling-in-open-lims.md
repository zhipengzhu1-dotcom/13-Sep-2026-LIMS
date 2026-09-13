# Is the raw-data system a second entity, and what does a suspect window scope to?

**Asked by:** the orchestrator, ticket #55
**Date:** 2026-09-11
**Status of sources:** Every structural claim below is read from source cloned and grepped on **2026-09-11**, not from documentation summaries or comparison sites. Clones were made into a session scratchpad, never into this repository's working tree. `senaite.instruments` was cloned but its HEAD is stale (last pushed 2022-05-20, not archived) — where SENAITE's answer to a question actually lives, it is in `senaite.core`'s own `exportimport/instruments` package, not in `senaite.instruments`, and that is noted at each finding, not assumed.

| Repo | Clone HEAD | HEAD date | Default branch | Latest released tag |
|---|---|---|---|---|
| `senaite/senaite.core` | `993f721e6d8494d94a4001cd3d73409504b67a49` | 2026-09-10 | `2.x` | `v2.6.0`, published 2025-04-04 |
| `senaite/senaite.instruments` | `fd30695868b23f03f99a9d034b8cc3c5defa9e9b` | 2022-05-20 | `master` | none (`gh api .../releases` → `[]`); repo not archived, but last push is 2022-05-20 |
| `I-TECH-UW/OpenELIS-Global-2` | `672c92a618f8ad146560846eacafb0e0a4178068` | 2026-09-10 | `develop` | `3.2.2.0`, published 2026-08-18 |
| `LabKey/server` / `LabKey/platform` | not re-cloned for this ticket | — | — | see "What I could not establish" — reused only the licence/topology facts already established in the audit-topology scout, not re-verified for this question |

**Currency notes.** SENAITE's legacy marker tag `v3.2.0` is a 2017 Bika-lineage artefact, not a current release (established in a prior scout's work on this map and re-confirmed here by the same `v2.6.0`/`2.x` facts). No draft FDA data-integrity guidance or withdrawn NIST handbook is cited anywhere in this file — this ticket is pure source-code archaeology, not regulatory text.

No real laboratory documents, client names, product names or batch identifiers appear anywhere in this file. All names below are open-source table, column, class and field names.

---

## Findings

### 0. The premise needs splitting in two, because the two codebases answer differently

SENAITE and OpenELIS Global 2 are not "two data points for one question." They embody two different eras of the same problem, in the same repository family in OpenELIS's case:

- **SENAITE** still has exactly the single physical-instrument model the ticket's premise describes: one `Instrument` content type, no software/CDS entity, an instrument-import mechanism that reads vendor files but writes their contents straight onto `Analysis` results.
- **OpenELIS Global 2** used to have that same single-entity model (a legacy `clinlims.instrument` table, still physically present in the schema) and **has since built a second, explicitly distinct entity — `Analyzer`** — together with an `AnalyzerType` class whose own doc-comment states the separation this ticket is asking about, in nearly the ticket's own words. That doc-comment class is itself now `@Deprecated(forRemoval = true)`, which is a further, separate finding: OpenELIS tried a type/instance split and appears to be moving away from it toward something else (see §1.2).

So "does any of them model this" is not a single yes/no — it is "one doesn't, and the one that does is mid-refactor and disagrees with its own recent past self."

---

## 1. Physical instrument vs. software/acquisition system as distinct entities

### 1.1 SENAITE — no distinct software entity. Verified.

The `Instrument` Archetypes content type (`bika.lims.content.instrument`, the schema SENAITE still runs — a DX migration is tracked as future work per its own `# TODO: Migrated to DX` comment on `Worksheet`, not on `Instrument`) declares, among others:

- `InstrumentType` — `UIDReferenceField`, `allowed_types=("InstrumentType",)`, `required=1` (`senaite.core/src/bika/lims/content/instrument.py:74-92`)
- `Manufacturer` — `UIDReferenceField`, `allowed_types=("Manufacturer",)`, `required=1` (`:94-112`)
- `Supplier` — `UIDReferenceField`, `allowed_types=("Supplier",)`, `required=1` (`:114-132`)
- `Model`, `SerialNo` — plain `StringField`s, not required, no uniqueness constraint declared in the schema (`:134-150`)
- `InstrumentLocation` — `UIDReferenceField`, `allowed_types=("InstrumentLocation",)`, `required=0` (`:313-332`)
- `DataInterface` — a `StringField` whose `vocabulary="getExportDataInterfacesList"` (`:217-228`); `ImportDataInterface` — a `multiValued` `StringField` whose `vocabulary="getImportDataInterfacesList"` (`:230-243`)
- `ResultFilesFolder` — a `RecordsField` with subfields `InterfaceName` / `Folder`, described as "a folder where the system should look for the results files while automatically importing results" (`:245-269`)
- `AssetNumber` — plain `StringField` (`:305-311`)

**`DataInterface`/`ImportDataInterface` are the closest thing to a "software system" field, and they are not an entity.** They are string-valued vocabulary picks over the names of Python parser modules shipped in the codebase (see §3) — a controlled vocabulary of *interface names*, not a reference to a first-class content object with its own fields, lifecycle, or identity. There is no `Software`, `AcquisitionSystem`, `DataSystem`, or `CDS` content type anywhere in the clone. I grepped `class .*\(Software\|DataSystem\|AcquisitionSystem\|CDS\)` across `senaite.core/src` — **zero hits, verified negative.**

`InstrumentLocation` is real and distinct — its own content type (`senaite.core/src/senaite/core/content/instrumentlocation.py`), a folderish setup object under `bika_setup`, referenced from `Instrument` as shown above. It is a place, not a system; nothing about it carries acquisition-software identity.

### 1.2 OpenELIS Global 2 — two eras, two different entities

**Era 1 (legacy, structurally present, functionally dead): `clinlims.instrument`.**

```sql
CREATE TABLE clinlims.instrument (
    id numeric(10,0) NOT NULL,
    scrip_id numeric(10,0),
    name character varying(20),
    description character varying(60),
    instru_type character varying(30),
    is_active character varying(1),
    location character varying(60)
);
```
(`db/dbInit/OpenELIS-Global.sql:1791-1799`, column comments at `:1806-1836`, including `instru_type` documented as `'Type of instrument: Mass Spec, HPLC, etc.'` at `:1821`)

**Verified negative:** I grepped for any Java entity or Hibernate mapping (`.hbm.xml`) targeting this table — `table = "instrument"`, `name = "instrument"`, `table="instrument"` — across `src/main/java` and `src/main/resources`. **Zero hits.** There is no `Instrument.java` value holder, no DAO, no HQL/JPQL against `clinlims.instrument` in the current codebase. The table, `instrument_analyte` (`:1843-1851`) and `instrument_log` (`:1879-1889`, columns `instru_id`, `instlog_type`, `event_begin`, `event_end`) exist in the base schema but are, on this evidence, **orphaned DDL from an earlier architecture**, not a live model. This is a structural claim about absence of code, not absence of a table — the table is real, its Java mapping is not.

**Era 2 (current, live, and explicitly documented as a type/instance split): `Analyzer`.**

`Analyzer` is a JPA entity (`OpenELIS-Global-2/src/main/java/org/openelisglobal/analyzer/valueholder/Analyzer.java:43-46`, `@Entity @Table(name = "analyzer")`) with fields including `name`, `active`, `siteBindingRevision` (a `@ManyToOne` to `AnalyzerSiteBindingRevision`), `bridgeConnectionId` (`String`, length 255), `latestActivationRecord` (`@ManyToOne` to `AnalyzerActivationRecord`), `testUnitIds` (a converted `List<String>`), `status` (`AnalyzerStatus` enum, default `SETUP`), `lastActivatedDate`, and — added later, see §4 — `fhirUuid` (`Analyzer.java:57-87`).

The doc-comment on the sibling class states the separation this ticket asks about, almost verbatim:

```java
/**
 * AnalyzerType represents the capability definition of an analyzer plugin.
 *
 * This entity separates "what an analyzer CAN do" (type/plugin) from "a
 * specific physical device" (Analyzer instance). This enables:
 * - Multiple physical analyzers of the same type (1:N relationship)
 * - Centralized plugin capability management
 * - Instance-specific configuration (location, IP, etc.) on Analyzer
 *
 * Architecture: AnalyzerType (1) ---> (*) Analyzer instances
 */
@Deprecated(forRemoval = true)
public class AnalyzerType extends BaseObject<String> {
```
(`OpenELIS-Global-2/src/main/java/org/openelisglobal/analyzer/valueholder/AnalyzerType.java:19-38`)

**But that class is `@Deprecated(forRemoval = true)`, and the live `Analyzer.getAnalyzerType()` method has been hollowed out:**

```java
/**
 * Compile-only compatibility for generic CI artifacts. The profile revision on
 * the Bridge-backed site binding is authoritative, so no OpenELIS analyzer type
 * is returned.
 */
@Deprecated(forRemoval = true)
@Transient
public AnalyzerType getAnalyzerType() {
    return null;
}
```
(`Analyzer.java:107-115`)

**Reading this precisely: OpenELIS built a type/instance split (`AnalyzerType` 1 : N `Analyzer`), and has since moved the "what can this analyzer do" question off `AnalyzerType` onto `AnalyzerSiteBindingRevision` / `AnalyzerProfileBinding` ("Bridge-backed site binding"), while leaving the deprecated class and a stub method in place for compile compatibility.** So the *current* answer to "is capability modelled separately from the physical device" is: it *was*, explicitly and by design, and the codebase is in the middle of relocating that responsibility elsewhere. I did not trace what "Bridge" is (an external system referenced by name, `bridgeConnectionId`) beyond what these fields show — see "What I could not establish."

**Neither `Analyzer` nor anything downstream of it is a chromatography data system.** OpenELIS's `Analyzer`/ASTM/HL7-oriented model (protocol field defaults to `"ASTM"` on the deprecated `AnalyzerType`, `AnalyzerType.java:50`) is built for clinical analyzers speaking device-interface protocols, not CDS software fronting an HPLC. I found no OpenELIS entity for chromatography or CDS-specific concepts (no "sequence," "injection," "chromatogram," or CDS vendor names anywhere in `src/main/java`). Verified negative: `grep -rin "chromatogra\|chromeleon\|empower\|openlab\|chemstation" OpenELIS-Global-2/src` — zero hits.

---

## 2. Sequence / run / worklist / injection as an artifact with its own identity

### 2.1 SENAITE — `Worksheet` is a bench-assignment artifact, not an acquisition artifact

`Worksheet` schema fields (`senaite.core/src/bika/lims/content/worksheet.py:74-131`):

- `WorksheetTemplate` — `UIDReferenceField`, `allowed_types=('WorksheetTemplate',)` (`:75-78`)
- `Layout` — `RecordsField`, `subfields=('position', 'type', 'container_uid', 'analysis_uid')` (`:80-84`)
- `Analyses` — `UIDReferenceField`, `multiValued=1`, `allowed_types=('Analysis', 'DuplicateAnalysis', 'ReferenceAnalysis', 'RejectAnalysis')` (`:86-91`)
- `Analyst` — `StringField` (`:93-96`)
- `Method` — `UIDReferenceField`, optional (`:98-108`)
- `Instrument` — `UIDReferenceField`, `allowed_types=('Instrument',)`, with an explicit in-code retirement note: `# TODO Remove. Instruments must be assigned directly to each analysis.` (`:110-116`)
- `Remarks`, `ResultsLayout` (`:118-131`)

There is **no acquisition timestamp, no run/sequence identifier, and no instrument-*instance*-at-acquisition-time field** carried by `Worksheet` beyond that one `Instrument` reference, which its own maintainers are in the process of deprecating in favour of per-`Analysis` instrument assignment. `WorksheetTemplate` (`senaite.core/src/bika/lims/content/worksheettemplate.py`, not read in full for this ticket beyond the reference above) is a layout template — a re-usable position/analysis-service pattern for building worksheets, not a per-run record. So: **`Worksheet` is confirmed to be a bench-assignment artifact.** It groups `Analysis` objects for human/bench workflow purposes (who is doing this batch, on what template, optionally on what instrument) and is not populated by, or tied to the identity of, an acquisition event.

**Verified negative for a distinct sequence/run/injection entity:** `grep -rn "class .*\(Sequence\|Run\|Injection\)" senaite.core/src/senaite/core/content senaite.core/src/bika/lims/content` — zero hits. There is no SENAITE content type named or shaped like a chromatography sequence.

### 2.2 OpenELIS — `analyzer_run`, but it is an import/preview batch, not an acquisition sequence

OpenELIS does have a table literally named `analyzer_run`, created by:

```sql
<!-- 014-hjra-file-stream-alignment: analyzer_run table for preview/batch data (OGC-324) -->
<changeSet id="014-003-create-analyzer-run" author="openelis">
  ...
  <comment>Create analyzer_run table for import batch and custom preview data</comment>
  <createTable tableName="analyzer_run">
    <column name="id" type="BIGINT" autoIncrement="true">...</column>
    <column name="analyzer_file_upload_id" type="BIGINT">
      <constraints nullable="false" foreignKeyName="fk_analyzer_run_upload"
          references="analyzer_file_upload(id)" deleteCascade="true"/>
    </column>
    <column name="plugin_id" type="VARCHAR(100)"/>
    <column name="custom_preview_data" type="JSONB"/>
    <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">...</column>
    <column name="last_updated" type="TIMESTAMP" defaultValueComputed="NOW()">...</column>
  </createTable>
```
(`OpenELIS-Global-2/src/main/resources/liquibase/3.4.14.x/003-create-analyzer-run.xml`, whole changeset; I confirmed this file is genuinely upstream by fetching it directly from the GitHub API at `develop` — the shallow clone's single-commit history could not otherwise confirm provenance.)

**Read precisely, this is not a chromatography-style "sequence."** Its own comment says "import batch and custom preview data," it FKs to `analyzer_file_upload` (a *file-upload* record — see §4), and it carries a `plugin_id` (which parser plugin produced this) and a `custom_preview_data` JSONB blob. It is scoped to **one file upload**, not to a physical acquisition run on an instrument, and it carries no instrument reference of its own (only transitively, through `analyzer_file_upload.analyzer_id`).

**Verified negative for anything closer to a CDS sequence/injection concept:** grepping OpenELIS's `src/main/java` for "sequence," "injection," "chromatogram" as domain nouns returns only unrelated hits (Hibernate `sequence_name` generator parameters, Java `Sequence`-adjacent collection types). There is no OpenELIS entity representing an ordered list of injections against a method, with its own acquisition start/end time, separate from `analyzer_run`'s file-import framing.

---

## 3. THE HIGH-VALUE ONE — what identifier does a real CDS export actually carry

### 3.1 Where the parsers actually live

`senaite.instruments` (the standalone package named in the ticket) is **stale** — its own `master` branch was last pushed 2022-05-20, and `gh api repos/senaite/senaite.instruments/releases` returns `[]`. It is not archived, and I did not find a deprecation notice in its README, but its content is not where the current instrument-import feature set lives. **The live, current parser set ships inside `senaite.core` itself**, at `senaite.core/src/senaite/core/exportimport/instruments/`, which on this HEAD contains **34 entries** including per-vendor directories: `abaxis`, `abbott`, `alere`, `beckmancoulter`, `biodrop`, `cobasintegra`, `eltra`, `facscalibur`, `foss`, `horiba`, `lachat`, `lifetechnologies`, `metler`, `nuclisens`, `panalytical`, `rigaku`, `rochecobas`, `scilvet`, `sealanalytical`, `shimadzu`, `sysmex`, `tescan`, `thermoscientific`, `varian`, plus `generic` and shared `importer.py`/`parser.py`/`resultsimport.py`/`utils.py`.

**None of these are Waters Empower, Thermo Chromeleon, or Agilent OpenLab/ChemStation by name.** I grepped for those vendor/product names case-insensitively across the whole `senaite.core` clone: `grep -rin "chromeleon\|empower\|openlab\|chemstation\|masshunter" senaite.core/src` — **zero hits, verified negative.** SENAITE's instrument-import ecosystem is built around clinical/analytical instruments (immunoassay analyzers, ICP, GC-MS, flow cytometry, spectrophotometers) submitting flat result files, not around CDS software product integrations by name.

**The closest thing to a chromatography CDS parser in the corpus is the Shimadzu `nexera` (LC/LCMS) parser**, which is genuinely chromatography instrument software output (Shimadzu's LabSolutions-family CDS export, referred to in-code only by instrument model name, not CDS product name).

### 3.2 Shimadzu Nexera LC2040C parser — field-by-field

File: `senaite.core/src/senaite/core/exportimport/instruments/shimadzu/nexera/LC2040C.py`. `title = "Shimadzu HPLC-PDA Nexera-I LC2040C"` (`:31`). Format: **tab-separated text** (`TSVParser`, `line.split('\t')`, `:106`), one block per analyte ("Name" line, e.g. `Name\tCBDV - cannabidivarin`), each block containing a header row and then one data row per injection.

Header row observed in the shipped sample file (`senaite.core/src/senaite/core/exportimport/instruments/shimadzu/nexera/samples/LC2040C.txt`, line 3) includes, among ~110 tab-separated columns: **`Data Filename`, `Sample Name`, `Sample ID`, `Sample Type`, `Level#`, `Ret. Time`, `Area`, `Height`, ... `Vial#`, `Tray`, ..., `Date Acquired`**, plus per-analyte quantitation columns (`Conc.`, `Std. Conc.`, etc.).

Parser field usage, quoted from the code (`LC2040C.py:99-146`):

- `'Sample ID'` — used as the row key for the imported result: `self._addRawResult(_results['Sample ID'], ...)` (`:145-146`). This is what SENAITE keys the result to (an analysis request/sample identifier the file itself carries — *not* a LIMS-generated one; it must match on import).
- `'Date Acquired'` — parsed with `datetime.strptime(_results['Date Acquired'], "%m/%d/%Y %I:%M:%S %p")` and written into `self._header['Output Date']` / `self._header['Output Time']` (`:129-137`). Example value from the sample file: `10/17/2016 7:55:06 PM`.
- `'Data Filename'` — present in every data row (example: `QC PREP A_QC PREP A_009.lcd`) but **the parser code does not read this column at all** — it is in `_currentresultsheader` (because it is a header token) and therefore lands in the `_results` dict via `zip(self._currentresultsheader, split_row)`, but nothing in `LC2040C.py` extracts or stores it separately from the rest of the row. It is present in the export, not consumed as a first-class identifier by the parser.
- `'DefaultResult'` — a parser-internal literal (`'Conc.'`), not a file field; it names which column of this block's data row is the reported concentration (`:107`, `:139-143`).
- No `Sample Name`, `Vial#`, `Tray`, or `Level#` field is read by the Python parser logic, despite being present in the file.

**What this tells us, factually, about a real CDS export's identifiers:**
- The file **does** carry a per-injection acquisition timestamp (`Date Acquired`) — this is real, concrete evidence that "acquired at" is a genuine field in vendor CDS output, not an invented one.
- The file **does** carry a per-injection raw-data filename (`Data Filename`, `*.lcd` — Shimadzu's native data-file extension) that functions as a pointer to the underlying acquisition file, though SENAITE's own parser ignores it.
- The file **does not** carry any field naming the acquiring software/system itself (no "Instrument Name," "System," "CDS," or similar column in the observed header).
- The file **does not** carry a sequence/run/injection-list identifier distinct from the per-row `Sample ID`/`Data Filename` pair — there is no batch/sequence-level column in this header at all; each row is self-describing.

I inspected the other `nexera` parser, `LCMS8050.py`, only by directory listing, not line-by-line — flagged as **not checked** below, since duplicating the same close read across every vendor parser was outside this ticket's scope once the pattern was established with a hard example.

### 3.3 What a human analyst could plausibly type into `rawDataIdentifier` — direct evidence, not inference

Given the above, the two candidate values a real CDS export makes available to a human transcribing by hand are: (a) the **acquisition-file name** (`Data Filename`, e.g. `QC PREP A_QC PREP A_009.lcd`), or (b) the **acquisition timestamp** (`Date Acquired`). Neither of these is a "sequence name" or "run ID" in the sense of a single identifier covering a batch of injections — the file has no such column. This is a fact about the shape of the one CDS-adjacent export format found in this corpus, not a claim about all real-world CDS exports; see "What I could not establish."

---

## 4. How results link back to the raw file / acquiring system

### 4.1 SENAITE — `AutoImportLog`, an instrument-scoped, filename-scoped log; no acquisition-time field

`AutoImportLog` schema (`senaite.core/src/bika/lims/content/autoimportlog.py:38-90`, only the fields relevant here reproduced):

- `ImportFile` — `StringField`, default `""`, documented "Results File that system wanted to import" (`:41-44`)
- `Instrument` — `UIDReferenceField`, `allowed_types=("Instrument",)` (`:46-63`)
- `Interface` — `StringField`, default `""` (`:65-68`) — the parser-module name (e.g. which vendor interface ran)
- `Results` — `TextField`, the logged raw results (`:70-80`, truncated in my read; not fully quoted here)

So the shape is: **one log row per import attempt, naming the physical Instrument and the parser Interface and the source filename, with the parsed results dumped as text.** There is no `AcquiredAt`/timestamp field on `AutoImportLog` itself distinct from the log's own `created`/`modified` (from `BikaSchema`, not reproduced).

The path from a stored `Analysis` result back to its instrument is a direct `UIDReferenceField` on the analysis: `Instrument = UIDReferenceField("Instrument", ..., allowed_types=("Instrument",), accessor="getInstrumentUID", ...)` declared once on `abstractbaseanalysis` (`senaite.core/src/bika/lims/content/abstractbaseanalysis.py:402-416`) and inherited by `Analysis`. There is **no** separate field on `Analysis` for the acquisition file, filename, or acquisition system — the importer (§3, `importer.py:162-164`, `self.instrument_uid` → `api.get_object(self.instrument_uid, None)`) resolves the *physical* `Instrument` the analyst picked from a dropdown at import time and stamps that UID onto the analysis; the vendor file's own per-row acquisition data (timestamp, filename) is consumed to populate the result value and capture date, not stored as a separate raw-data pointer.

I also checked the generic `Attachment` content type (`senaite.core/src/bika/lims/content/attachment.py`) — it has a `FileField` (`:49-54`, blob storage) and can be linked to an `Analysis`, but this is the generic lab-attachment mechanism (photos, PDFs, scanned worksheets), not something wired specifically into the instrument-import pipeline. I did not trace whether instrument-import ever creates an `Attachment` automatically; **not checked**.

### 4.2 OpenELIS — `analyzer_file_upload` + `analyzer_results` source-context columns: the richest link-back model in this corpus

Two migrations give a materially more complete picture than SENAITE's.

**`analyzer_file_upload`** (`OpenELIS-Global-2/src/main/resources/liquibase/3.4.14.x/002-create-analyzer-file-upload.xml`), described in its own comment as *"Create analyzer_file_upload table for file upload/import audit trail"*:

```xml
<column name="analyzer_id" type="INT">
  <constraints nullable="false" foreignKeyName="fk_analyzer_file_upload_analyzer"
      references="analyzer(id)" deleteCascade="false"/>
</column>
<column name="filename" type="VARCHAR(255)"><constraints nullable="false"/></column>
<column name="file_hash_sha256" type="VARCHAR(64)"><constraints nullable="false"/></column>
<column name="file_size" type="BIGINT"/>
<column name="status" type="VARCHAR(20)" defaultValue="PENDING"><constraints nullable="false"/></column>
<column name="result_count" type="INTEGER"/>
<column name="error_message" type="TEXT"/>
<column name="uploaded_by" type="NUMERIC(10,0)">
  <constraints nullable="false" foreignKeyName="fk_analyzer_file_upload_user" references="system_user(id)"/>
</column>
<column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()"><constraints nullable="false"/></column>
<column name="completed_at" type="TIMESTAMP"/>
```

This is a real FK from the file upload to `analyzer` (the physical/software-adjacent entity of §1.2), plus a **content hash of the uploaded file** (`file_hash_sha256`) — something neither SENAITE artefact carries. It answers "what file, from what analyzer, uploaded by whom, when, with how many results, with what outcome."

**`analyzer_results.source_*` columns**, added by `096-analyzer-result-source-context.xml`, comment *"Preserve normalized Bridge source identity and raw analyzer context on the existing result staging row"*:

```xml
<column name="source_message_id" type="VARCHAR(255)"/>
<column name="source_connection_id" type="VARCHAR(255)"/>
<column name="source_profile_id" type="VARCHAR(128)"/>
<column name="source_profile_revision" type="INTEGER"/>
<column name="source_protocol" type="VARCHAR(20)"/>
<column name="source_transport" type="VARCHAR(20)"/>
<column name="raw_test_code" type="VARCHAR(255)"/>
<column name="raw_result_value" type="TEXT"/>
<column name="result_classification" type="VARCHAR(12)"/>
<column name="recognition_mode" type="VARCHAR(12)"/>
<column name="recognition_outcome" type="VARCHAR(20)"/>
<column name="recognition_fingerprint" type="VARCHAR(71)"/>
<column name="source_payload" type="TEXT"/>
```

`source_message_id` is the closest thing in this whole corpus to a per-acquisition-event identifier distinct from a filename — but it is scoped to **one inbound integration message** (from OpenELIS's "Bridge" integration layer, an external component referenced by name but not otherwise investigated here), not to a chromatography sequence.

**`analysis.analyzer_id`** — a direct FK added specifically to solve the link-back problem, with the migration's own comment naming the exact failure mode this ticket is asking about:

```xml
<!--
    OGC-530: Analyzer metadata not flowing through FHIR Observation.device

    1. Adds analyzer_id column to analysis table so accepted analyzer results
       preserve their source instrument.
    2. Adds fhir_uuid to the analyzer table with backfill, NOT NULL, and
       UNIQUE so each analyzer gets a stable FHIR Device resource identity.
-->
```
(`OpenELIS-Global-2/src/main/resources/liquibase/3.5.x.x/096-analyzer-result-source-context.xml`... — note: the `analysis.analyzer_id` addition and `fhir_uuid` addition are in `3.5.x.x/004-analysis-analyzer-id.xml`, a *different* file from the `source_*` columns migration also numbered differently by area; both quoted accurately above from their respective files, `3.5.x.x/004-analysis-analyzer-id.xml:1-90` for the FK/FHIR-UUID changesets)

This is the single clearest piece of evidence in the corpus that a mature open-source LIMS hit **exactly** the "raw data provenance was getting lost between the physical device and the result" problem and fixed it with an explicit FK plus a stable external identity (`fhir_uuid`, `UNIQUE`, backfilled) for the acquiring entity — but note what it names as the fix's target: **`analyzer` (the device/software-adjacent entity of §1.2), not a raw-data-file pointer and not a sequence.** The fix is "know which analyzer produced this analysis," not "know which acquisition run or file did."

---

## 5. System suitability / QC validity — what subject does it scope to?

**Confirmed: it scopes to the physical `Instrument`, in SENAITE, via reference-sample analyses.**

`Instrument.isQCValid()` (`senaite.core/src/bika/lims/content/instrument.py:488-520`, docstring and query reproduced):

```python
def isQCValid(self):
    """ Returns True if the results of the last batch of QC Analyses
    performed against this instrument was within the valid range.
    ...
    looks for siblings (through RefAnalysisGroupID) and if the results
    for all them are valid, then returns True. If there is one single
    Reference Analysis from the group with an out-of-range result, the
    function returns False
    """
    query = {
        "portal_type": "ReferenceAnalysis",
        "getInstrumentUID": self.UID(),
        "sort_on": "getResultCaptureDate",
        "sort_order": "descending",
    }
    brains = api.search(query, ANALYSIS_CATALOG)
    if len(brains) == 0:
        return True
    ...
```

The query is **`ReferenceAnalysis` objects filtered by `getInstrumentUID` equal to this instrument's UID**, sorted by `getResultCaptureDate`, grouped by `RefAnalysisGroupID` (a batch-of-reference-analyses concept, read from the docstring; I did not separately open `RefAnalysisGroupID`'s definition — **not checked** beyond this docstring's description). `isQCValid()` feeds directly into `isValid()` (`:477-486`), which also checks certification dates, calibration-hold flag, and validation/calibration-in-progress flags — **all instrument-scoped**, none scoped to a worksheet, a method, or a raw-data pointer.

So: **the subject of a QC-validity judgement in SENAITE is the physical `Instrument`**, evaluated against its most recent batch of `ReferenceAnalysis` results, not against a worksheet, a sequence, or an acquisition-software identity. I did not find an equivalent "system suitability" concept in OpenELIS at all — **verified negative**, grep for "suitability" across `OpenELIS-Global-2/src/main/java` returns zero hits, and the `Analyzer`/`AnalyzerEvent` model in §1.2/§4.2 has no QC-validity method comparable to `isQCValid()`.

---

## What I could not establish

- **Whether any other parser in `senaite.core/src/senaite/core/exportimport/instruments/` (33 vendor entries beyond `shimadzu/nexera`) carries a sequence-level identifier that `LC2040C.py` does not.** I close-read exactly one parser (`LC2040C.py`) against its shipped sample file and only directory-listed the rest (`shimadzu/gcms`, `shimadzu/icpe`, `thermoscientific/*`, `varian/vistapro`, `horiba/jobinyvon`, `rochecobas/taqman`). A vendor closer to true chromatography sequencing (if one exists among the remaining 30) was not verified.
- **Whether `senaite.instruments` (the standalone, stale package named in the ticket) differs materially from `senaite.core`'s own current parser set**, e.g. whether it has vendor coverage `senaite.core` has since dropped. I listed its top-level directories but did not diff its parser contents against `senaite.core`'s.
- **What OpenELIS's "Bridge" integration component actually is** — `bridgeConnectionId` on `Analyzer` and "Bridge-backed site binding" in code comments reference it by name repeatedly, but I did not locate or read its own repository or documentation. Whether Bridge is itself a form of "acquisition software" entity, external to OpenELIS, is unresolved.
- **Whether `RefAnalysisGroupID`** (referenced only in `isQCValid()`'s docstring) is a real field with its own definition and, if so, what its exact scope is (per-instrument batch? per-day? per-method?) — not opened.
- **Whether SENAITE's instrument-import pipeline ever creates an `Attachment` object** pointing at the originally uploaded vendor file, preserving the file itself alongside the parsed values. I found the generic `Attachment` content type but did not trace `importer.py`/`resultsimport.py` for a call site that creates one during import.
- **LabKey Server** was not re-cloned or re-investigated for this ticket; nothing above relies on LabKey. A prior scout's audit-topology work touched LabKey's `Instrument`-adjacent or CDS-adjacent modelling not at all, so this ticket has no LabKey finding, positive or negative, to report — that absence is a gap in coverage, not a verified negative.
- **Whether OpenELIS's `analyzer_run` table (§2.2) is used anywhere as a UI-facing "sequence" concept**, versus being purely an internal staging artefact for the import pipeline. I read only its DDL/migration; I did not trace its DAO, service layer, or any controller/view that surfaces it to a user.

---

## Sources

All cloned and read on **2026-09-11**.

**senaite/senaite.core** — HEAD `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), branch `2.x`, latest release `v2.6.0` (2025-04-04).
- `src/bika/lims/content/instrument.py:60-390` (schema, `isValid`/`isQCValid` at 477-520)
- `src/bika/lims/content/autoimportlog.py:20-90`
- `src/bika/lims/content/worksheet.py:60-145`
- `src/bika/lims/content/abstractbaseanalysis.py:395-418`
- `src/bika/lims/content/attachment.py:1-60`
- `src/senaite/core/content/instrumentlocation.py` (existence only)
- `src/senaite/core/exportimport/instruments/` — directory listing (34 entries) and vendor-directory listings for `shimadzu`, `thermoscientific`, `varian`, `horiba`, `rochecobas`
- `src/senaite/core/exportimport/instruments/shimadzu/nexera/LC2040C.py:1-175` (full file read)
- `src/senaite/core/exportimport/instruments/shimadzu/nexera/samples/LC2040C.txt` (sample export, header + data rows)
- `src/senaite/core/exportimport/instruments/importer.py:140-180`
- Verified-negative greps across `src/`: `class .*(Sequence|Run|Injection)` (zero hits, content dirs); `chromeleon|empower|openlab|chemstation|masshunter` (zero hits); `class .*(Software|DataSystem|AcquisitionSystem|CDS)` (zero hits); `acquisition` (35 hits, all Zope `Acquisition` machinery or English prose about acquisition chains, none domain-specific)
- `gh api repos/senaite/senaite.core/releases`, `gh api repos/senaite/senaite.core --jq .default_branch`

**senaite/senaite.instruments** — HEAD `fd30695868b23f03f99a9d034b8cc3c5defa9e9b` (2022-05-20), branch `master`.
- `gh api repos/senaite/senaite.instruments` (`pushed_at: 2022-05-20`, `archived: false`, `default_branch: master`)
- `gh api repos/senaite/senaite.instruments/releases` (`[]`)
- top-level directory listing only (`src/senaite/instruments/{instruments,profiles,tests,docs}`) — not close-read

**I-TECH-UW/OpenELIS-Global-2** — HEAD `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10), branch `develop`, latest release `3.2.2.0` (2026-08-18).
- `db/dbInit/OpenELIS-Global.sql:1791-1899` (`clinlims.instrument`, `instrument_analyte`, `instrument_log`), `:304-333` (`clinlims.analysis` base columns, pre-migration)
- `src/main/java/org/openelisglobal/analyzer/valueholder/Analyzer.java:1-160`
- `src/main/java/org/openelisglobal/analyzer/valueholder/AnalyzerType.java:1-55`
- `src/main/java/org/openelisglobal/analyzer/valueholder/AnalyzerSiteBinding.java:1-60`
- `src/main/java/org/openelisglobal/analyzer/valueholder/AnalyzerEvent.java:1-90`
- `src/main/resources/liquibase/3.4.14.x/002-create-analyzer-file-upload.xml` (whole file)
- `src/main/resources/liquibase/3.4.14.x/003-create-analyzer-run.xml` (whole file; provenance re-confirmed via `gh api repos/I-TECH-UW/OpenELIS-Global-2/contents/...?ref=develop` because the local clone is shallow/single-commit)
- `src/main/resources/liquibase/3.5.x.x/004-analysis-analyzer-id.xml` (whole file)
- `src/main/resources/liquibase/3.5.x.x/096-analyzer-result-source-context.xml` (whole file)
- Directory listing of `src/main/resources/liquibase/3.4.x.x/` and `3.5.x.x/` filtered on `*analyzer*` (used to identify which migrations to read; not all opened)
- Verified-negative greps across `src/main/java`: `table = "instrument"` / `name = "instrument"` / `table="instrument"` (zero hits); `chromatogra|chromeleon|empower|openlab|chemstation` (zero hits); `suitability` (zero hits)
- `gh api repos/I-TECH-UW/OpenELIS-Global-2/releases`

**Not re-investigated for this ticket:** `LabKey/server`, `LabKey/platform` — see "What I could not establish."
