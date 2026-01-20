# Projects (Seed Data)

This file is the source-of-truth seed list for the app. The parser reads each checklist item (`- [ ] ...`) and ingests the indented metadata block below it.

## Format

Minimal template (recommended fields):

```md
- [ ] Project title
  - domain: Writing | Experiments | DH | Grants | Admin
  - type: Article | Book | Translation | Edited Volume | Book Review | Digital Humanities | Grant | Book Proposal
  - status: Upcoming | Early Stage | Draft | Experimental | Revision | Complete | Needs Update | Rejected | Published
  - priority: High | Medium | Low | Aspirational
  - deadline: 2026-12-31
  - deadlineNote: End of November
  - coAuthors: Jane Doe; John Doe
  - favorite: false
  - description: |
      Multi-line notes.
```

Notes:
* `domain`, `type`, `status`, `priority` are required for each entry.
* `deadline` is an ISO date (`YYYY-MM-DD`). Use `deadlineNote` for human deadlines like “Before Xmas”.

## Immediate Priorities & Deadlines

- [ ] Ager — The Scent of Ancient Magic (Book Review)
  - id: br-ager-scent-ancient-magic
  - domain: Writing
  - type: Book Review
  - status: Draft
  - priority: High
  - deadlineNote: End of week
  - description: Drafting.

- [ ] Le Febvre — The Science of Life in Aristotle and the Early Peripatos (Book Review)
  - id: br-lefebvre-science-of-life
  - domain: Writing
  - type: Book Review
  - status: Upcoming
  - priority: High
  - deadlineNote: End of November

- [ ] Michael of Ephesus: Philosopher and Commentator (Edited Volume)
  - id: ev-michael-of-ephesus-brill-intro
  - domain: Writing
  - type: Edited Volume
  - status: Draft
  - priority: High
  - deadlineNote: Before Xmas
  - description: Write introduction and send to Brill.

- [ ] Metaphor in Aristotle’s Natural Science (Studium Estonica)
  - id: art-metaphor-aristotle-natural-science
  - domain: Writing
  - type: Article
  - status: Needs Update
  - priority: High
  - deadlineNote: ASAP
  - description: Update 10-year-old draft.

- [ ] P.Oxy 5242, Perfumery and the Greco-Egyptian Alchemical Tradition (Proceedings)
  - id: art-poxy-5242-perfumery-alchemy
  - domain: Writing
  - type: Article
  - status: Draft
  - priority: High
  - deadlineNote: Year end
  - description: Conference proceedings.

## Book Projects

### Public-Facing & Trade

- [ ] A History in Five Perfumes: The Ancient World in Scent
  - id: book-history-five-perfumes
  - domain: Writing
  - type: Book
  - status: Early Stage
  - priority: Medium
  - description: |
      Core concept/outline complete.
      Next step: full proposal + sample chapter (Stakte), Jan–Mar 2026.

- [ ] The Alchemy of Absence / Ghost Scents
  - id: book-alchemy-of-absence
  - domain: Writing
  - type: Book
  - status: Early Stage
  - priority: Medium
  - description: |
      Essayistic concept on “productive error”.
      Next step: concept art + 1 chapter draft by mid-2026.

### Academic Monographs

- [ ] Athenaeus of Attalia: Complete Fragments
  - id: book-athenaeus-attalia-fragments
  - domain: Writing
  - type: Book
  - status: Revision
  - priority: Medium
  - description: Draft of fragments/translation done; commentary needs significant work.

- [ ] A Subtler Alchemy: Technical Change in Greek and Roman Perfumery (500 BCE–1000 CE)
  - id: book-subtler-alchemy-technical-change
  - domain: Experiments
  - type: Book
  - status: Experimental
  - priority: Medium
  - description: Experimental study.

- [ ] Art Imitates Nature: Greek and Roman Views on the Discovery of the Arts
  - id: book-art-imitates-nature
  - domain: Writing
  - type: Book
  - status: Upcoming
  - priority: Aspirational
  - description: Aspirational.

- [ ] Twin Sciences: Perfumery and Dyeing in the Ancient World
  - id: book-twin-sciences
  - domain: Writing
  - type: Book
  - status: Upcoming
  - priority: Aspirational
  - description: Planned for 2027 expanded monograph.

## Articles & Papers

### Ancient Philosophy & Medicine

- [ ] Aristotle on the Separation of Males and Females
  - id: art-aristotle-separation-sexes
  - domain: Writing
  - type: Article
  - status: Needs Update
  - priority: Medium
  - description: Needs significant updating/revision.

- [ ] Aristotle’s On Drunkenness
  - id: art-aristotle-on-drunkenness
  - domain: Writing
  - type: Article
  - status: Draft
  - priority: Medium
  - description: Co-authored; in draft.

- [ ] The Good in Aristotle’s Natural Science
  - id: art-good-aristotle-natural-science
  - domain: Writing
  - type: Article
  - status: Revision
  - priority: Medium
  - description: Needs revision after Philosopher’s Imprint rejection.

- [ ] Teleology After Aristotle: Theophrastus and the Causal Field of Plant Life
  - id: art-teleology-after-aristotle
  - domain: Writing
  - type: Article
  - status: Early Stage
  - priority: Medium

- [ ] Theophrastus on Art Completing Nature
  - id: art-theophrastus-art-completing-nature
  - domain: Writing
  - type: Article
  - status: Complete
  - priority: Medium
  - description: Complete draft.

- [ ] Athenaeus the Aristotelian (Festschrift)
  - id: art-athenaeus-aristotelian-festschrift
  - domain: Writing
  - type: Article
  - status: Revision
  - priority: Medium
  - description: Near complete / in revision.

- [ ] The On Remedies Tradition (περὶ βοηθημάτων)
  - id: art-on-remedies-tradition
  - domain: Writing
  - type: Article
  - status: Early Stage
  - priority: Medium
  - description: Early draft; establishing the Pneumatist genre.

- [ ] Remedies and Agency: The ἐφ’ ἡμῖν Criterion in Ancient Therapeutics
  - id: art-remedies-and-agency
  - domain: Writing
  - type: Article
  - status: Early Stage
  - priority: Medium
  - description: Early draft.

- [ ] Oribasius and the Pneumatist Division of Medicine
  - id: art-oribasius-pneumatist-division
  - domain: Writing
  - type: Article
  - status: Draft
  - priority: Medium
  - description: Drafting; organizational schema of Collectiones Medicae.

- [ ] Aetius of Amida (Brill compendium chapter)
  - id: art-aetius-amida-brill-chapter
  - domain: Writing
  - type: Article
  - status: Draft
  - priority: Medium
  - description: Single author chapter for Brill compendium / Byzantine medicine volume.

- [ ] Michael of Ephesus on Sexual Difference as Adaptation
  - id: art-michael-of-ephesus-sexual-difference
  - domain: Writing
  - type: Article
  - status: Early Stage
  - priority: Medium
  - description: For co-edited volume.

- [ ] Galen on Solecism
  - id: art-galen-on-solecism
  - domain: Writing
  - type: Article
  - status: Early Stage
  - priority: Medium
  - description: Co-authored.

### Experimental Philology & DH

- [ ] Disambiguating Dioscorides (Notes and Records)
  - id: dh-disambiguating-dioscorides
  - domain: DH
  - type: Digital Humanities
  - status: Draft
  - priority: Medium
  - description: Single authored; DH project writeup.

- [ ] Democritus’ Party Tricks (Classical Quarterly note)
  - id: exp-democritus-party-tricks
  - domain: Experiments
  - type: Article
  - status: Early Stage
  - priority: Medium
  - description: Note using experimental replication.

- [ ] A New Method for Identifying Ancient Stacte
  - id: exp-identifying-ancient-stacte
  - domain: Experiments
  - type: Article
  - status: Complete
  - priority: Medium
  - description: Experimental work complete.

- [ ] Ancient Volatile Fractioning Techniques
  - id: exp-volatile-fractioning-techniques
  - domain: Experiments
  - type: Article
  - status: Experimental
  - priority: Medium
  - description: Lead author; target PNAS; needs “sexier” title.

- [ ] Stypsis in Perfumery and the Arts of Dyeing
  - id: exp-stypsis-perfumery-dyeing
  - domain: Experiments
  - type: Article
  - status: Complete
  - priority: Medium
  - description: Complete draft; conference proceedings.

- [ ] What did “stypsis” mean in ancient perfumery?
  - id: exp-stypsis-meaning
  - domain: Experiments
  - type: Article
  - status: Experimental
  - priority: Medium
  - description: Experimental focus.

- [ ] Making Susinum (the lily project)
  - id: exp-making-susinum
  - domain: Experiments
  - type: Article
  - status: Experimental
  - priority: Medium

- [ ] Organic Residue Analysis & Mendesian Fragrance
  - id: exp-ora-mendesian-fragrance
  - domain: Experiments
  - type: Article
  - status: Early Stage
  - priority: Medium
  - description: Co-authored; middle/last author.

- [ ] A Data Model for the History of Ancient Pharmacology
  - id: dh-data-model-ancient-pharmacology
  - domain: DH
  - type: Digital Humanities
  - status: Early Stage
  - priority: Medium
  - description: Principles done; needs work.

### Reception

- [ ] A 3rd Century Ink Recipe and its Modern Reception
  - id: art-3rd-century-ink-recipe
  - domain: Writing
  - type: Article
  - status: Revision
  - priority: Medium
  - description: Complete draft; in revision.

- [ ] The Fragrance of Places We Have Not Known
  - id: art-fragrance-of-places-reception
  - domain: Writing
  - type: Article
  - status: Revision
  - priority: Medium
  - description: Coty, Fascism, and Ancient Greek reception; final revisions.

## Translations & Edited Volumes

### Translations

- [ ] Aetius of Amida I and II (De Gruyter)
  - id: tr-aetius-amida-i-ii
  - domain: Writing
  - type: Translation
  - status: Early Stage
  - priority: High
  - description: Massive work required; co-authored.

- [ ] Michael of Ephesus — On Aristotle’s Generation of Animals I–II (Sorabji Series)
  - id: tr-michael-of-ephesus-generation-of-animals
  - domain: Writing
  - type: Translation
  - status: Revision
  - priority: High
  - description: Draft translation done; needs commentary.

- [ ] Galen’s Hippocratic Commentary
  - id: tr-galen-hippocratic-commentary
  - domain: Writing
  - type: Translation
  - status: Early Stage
  - priority: Medium
  - coAuthors: Peter Singer

- [ ] Galen — Against Lycus + Against Julian
  - id: tr-galen-against-lycus-julian
  - domain: Writing
  - type: Translation
  - status: Early Stage
  - priority: Medium
  - coAuthors: Peter Singer

- [ ] [Galen] — On Causes of Affections
  - id: tr-galen-on-causes-of-affections
  - domain: Writing
  - type: Translation
  - status: Early Stage
  - priority: Medium

- [ ] Galen — Simples VI–XI
  - id: tr-galen-simples-vi-xi
  - domain: Writing
  - type: Translation
  - status: Early Stage
  - priority: Medium

### Edited Volumes

- [ ] Perfume Production in the Ancient World
  - id: ev-perfume-production-ancient-world
  - domain: Writing
  - type: Edited Volume
  - status: Early Stage
  - priority: Medium
  - coAuthors: Laurence Totelin
  - description: Needs work.

## Digital Humanities Projects

- [ ] Ancient Perfumery Cookbook
  - id: dh-ancient-perfumery-cookbook
  - domain: DH
  - type: Digital Humanities
  - status: Early Stage
  - priority: Medium
  - description: Relational database for recipe replication; ~200 recipes.

- [ ] Digital Dioscorides
  - id: dh-digital-dioscorides
  - domain: DH
  - type: Digital Humanities
  - status: Early Stage
  - priority: Medium
  - description: Searchable portal for online editions/translations.

- [ ] ARTEFACT
  - id: dh-artefact
  - domain: DH
  - type: Digital Humanities
  - status: Upcoming
  - priority: Aspirational
  - description: Aspirational system for diachronic tracing of recipe knowledge.

- [ ] Ancient Perfumery (TEITOK)
  - id: dh-ancient-perfumery-teitok
  - domain: DH
  - type: Digital Humanities
  - status: Early Stage
  - priority: Medium
  - description: TEI of ancient texts.

- [ ] GitHub maintenance
  - id: dh-github-maintenance
  - domain: DH
  - type: Digital Humanities
  - status: Upcoming
  - priority: Low
  - description: github.com/alchemiesofscent

## Grants

- [ ] ERC Consolidator Grant re-application
  - id: grant-erc-consolidator-2027
  - domain: Grants
  - type: Grant
  - status: Upcoming
  - priority: Aspirational
  - description: Target 2027.

- [ ] Current grant management: Alchemies of Scent (GACR through June 2026)
  - id: grant-alchemies-of-scent-management
  - domain: Grants
  - type: Grant
  - status: Draft
  - priority: High

- [ ] Future funding: Biomarkers for Commiphora myrrha
  - id: grant-biomarkers-commiphora-myrrha
  - domain: Grants
  - type: Grant
  - status: Early Stage
  - priority: Medium
  - description: Scout new avenues (following 2025 rejection).

## Completed / Published (Reference)

- [x] Nenib List: A synoptic reading of ancient Egyptian ritual ingredients
  - id: pub-nenib-list
  - domain: Writing
  - type: Article
  - status: Published
  - priority: Low

- [x] Modular Persistence in an Ink Recipe Tradition
  - id: pub-modular-persistence-ink-recipe
  - domain: Writing
  - type: Article
  - status: Complete
  - priority: Low
  - description: Draft complete.

- [x] Subject Development Award (SHAC)
  - id: pub-subject-development-award-shac
  - domain: Grants
  - type: Grant
  - status: Published
  - priority: Low
  - description: 2023, 2025.

- [x] Popularization Award (Institute of Philosophy, Czech Academy)
  - id: pub-popularization-award-ipa
  - domain: Grants
  - type: Grant
  - status: Published
  - priority: Low
  - description: 2022.
