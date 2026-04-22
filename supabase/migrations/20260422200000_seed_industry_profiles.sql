-- Seed industry_profiles with 3 rich starter rows: saas, fintech, recruitment.
-- Each profile contains realistic, industry-authentic content for layered prompt assembly.

INSERT INTO public.industry_profiles (
  id, slug, display_name,
  buyer_personas, vocabulary, objection_patterns, discovery_frameworks,
  compliance_flags, call_stage_behaviours, pricing_sensitivity_profile,
  buying_committee_structure
) VALUES

-- ============================================================
-- SaaS: B2B SaaS selling to mid-market (Series A–C)
-- ============================================================
(
  gen_random_uuid(),
  'saas',
  'B2B SaaS (Mid-Market)',

  -- buyer_personas
  '[
    {
      "title": "VP of Sales",
      "seniority": "VP",
      "reports_to": "CRO or CEO",
      "priorities": ["Pipeline velocity", "Rep ramp time", "Forecast accuracy", "Tech stack consolidation"],
      "skepticisms": ["Yet another tool my reps wont use", "Integration fatigue", "ROI claims without proof"],
      "communication_style": "Direct, numbers-driven, impatient with fluff",
      "stage_involvement": {
        "discovery": "Will take a 25-minute call if the hook is strong. Wants to hear about outcomes, not features.",
        "evaluation": "Delegates to Sales Ops for technical eval but reviews business case personally. Wants a champion on their team to own it.",
        "negotiation": "Pushes hard on pricing, wants multi-year discount, asks about ramp guarantees."
      }
    },
    {
      "title": "Head of Revenue Operations",
      "seniority": "Director",
      "reports_to": "VP of Sales or CRO",
      "priorities": ["Data hygiene", "Process standardisation", "Reducing tool sprawl", "Reporting accuracy"],
      "skepticisms": ["Will this break our Salesforce workflows?", "Migration effort", "Another dashboard no one checks"],
      "communication_style": "Analytical, detail-oriented, wants to see the integration architecture",
      "stage_involvement": {
        "discovery": "Joins if the VP asks them to evaluate. Immediately asks about APIs and data model.",
        "evaluation": "Runs the technical proof of concept. Tests edge cases. Will find every gap.",
        "negotiation": "Advises on contract terms related to data, SLAs, and implementation timeline."
      }
    },
    {
      "title": "Sales Manager / Team Lead",
      "seniority": "Manager",
      "reports_to": "VP of Sales",
      "priorities": ["Team quota attainment", "Coaching efficiency", "Activity visibility", "Rep retention"],
      "skepticisms": ["My reps are already drowning in tools", "Does this actually help or just add reporting overhead?"],
      "communication_style": "Practical, wants to see the day-to-day workflow, asks about adoption",
      "stage_involvement": {
        "discovery": "Rarely on the first call. Joins evaluation if the VP pulls them in as a pilot user.",
        "evaluation": "Tests the tool themselves. Wants to see coaching workflows and rep-facing UX.",
        "negotiation": "Provides input on seat count and rollout plan. Not a budget holder."
      }
    },
    {
      "title": "CFO / VP Finance",
      "seniority": "C-Suite",
      "reports_to": "CEO",
      "priorities": ["Burn rate", "Payback period on new tools", "Contract flexibility", "Headcount efficiency"],
      "skepticisms": ["Can we not just build this in-house?", "What happens if we downsize?", "Show me the unit economics"],
      "communication_style": "Skeptical, financially literate, wants hard numbers not narratives",
      "stage_involvement": {
        "discovery": "Never on discovery calls. Appears late in evaluation or at negotiation.",
        "evaluation": "Reviews business case document. Asks about competitive pricing.",
        "negotiation": "Final sign-off. Negotiates payment terms, annual vs monthly, cancellation clauses."
      }
    }
  ]'::jsonb,

  -- vocabulary
  '{
    "terms": [
      {"term": "ARR", "definition": "Annual Recurring Revenue", "usage_example": "We crossed $8M ARR last quarter", "common_misuse": "Confusing ARR with ACV or total bookings"},
      {"term": "NDR", "definition": "Net Dollar Retention", "usage_example": "Our NDR is 115% so existing accounts are growing", "common_misuse": "Quoting gross retention when someone asks about NDR"},
      {"term": "CAC", "definition": "Customer Acquisition Cost", "usage_example": "Our CAC payback is 14 months", "common_misuse": "Not including fully loaded costs like SDR salaries"},
      {"term": "ACV", "definition": "Annual Contract Value", "usage_example": "Average ACV is around $45K", "common_misuse": "Mixing up ACV with TCV on multi-year deals"},
      {"term": "Pipeline coverage", "definition": "Ratio of pipeline to quota", "usage_example": "We need 3.5x coverage to hit our number", "common_misuse": "Counting aged pipeline in coverage calculations"},
      {"term": "Sales velocity", "definition": "Speed at which deals move through the pipeline", "usage_example": "Our velocity dropped 20% after adding a security review stage", "common_misuse": "Measuring velocity without weighting by deal size"},
      {"term": "Win rate", "definition": "Percentage of opportunities that close-won", "usage_example": "Win rate on competitive deals is 32%", "common_misuse": "Inflating win rate by excluding early-stage losses"},
      {"term": "Ramp time", "definition": "Time for a new rep to reach full quota", "usage_example": "Ramp time is 6 months for enterprise AEs", "common_misuse": "Measuring ramp to first deal instead of full productivity"},
      {"term": "Product-led growth", "definition": "Go-to-market model where the product drives acquisition", "usage_example": "PLG gets us signups but sales closes enterprise", "common_misuse": "Assuming PLG means no sales team needed"},
      {"term": "Land and expand", "definition": "Start small, grow within the account over time", "usage_example": "We land with one team then expand org-wide", "common_misuse": "Landing too small to ever get executive attention"},
      {"term": "Multi-threading", "definition": "Building relationships with multiple stakeholders", "usage_example": "Single-threaded deals die when your champion leaves", "common_misuse": "Thinking multi-threading means CCing more people on emails"},
      {"term": "MEDDICC", "definition": "Sales qualification framework", "usage_example": "Our deal reviews follow MEDDICC methodology", "common_misuse": "Treating it as a checklist instead of a diagnostic tool"},
      {"term": "Champion", "definition": "Internal advocate who sells on your behalf", "usage_example": "Without a champion this deal stalls at procurement", "common_misuse": "Confusing a friendly contact with a true champion who has influence"},
      {"term": "Churn", "definition": "Customers who cancel or do not renew", "usage_example": "Logo churn is 8% but revenue churn is only 3%", "common_misuse": "Not distinguishing logo churn from revenue churn"},
      {"term": "Tech debt", "definition": "Accumulated cost of shortcuts in engineering", "usage_example": "We are spending 30% of eng capacity on tech debt", "common_misuse": "Using it as a blanket excuse for slow feature delivery"}
    ],
    "acronyms": [
      {"acronym": "ARR", "expansion": "Annual Recurring Revenue", "context": "Primary growth metric for SaaS"},
      {"acronym": "MRR", "expansion": "Monthly Recurring Revenue", "context": "Used for month-over-month tracking"},
      {"acronym": "ACV", "expansion": "Annual Contract Value", "context": "Per-deal metric for bookings"},
      {"acronym": "TCV", "expansion": "Total Contract Value", "context": "Full value of multi-year agreements"},
      {"acronym": "NDR", "expansion": "Net Dollar Retention", "context": "Measures expansion minus churn on existing accounts"},
      {"acronym": "CAC", "expansion": "Customer Acquisition Cost", "context": "All-in cost to acquire a customer"},
      {"acronym": "LTV", "expansion": "Lifetime Value", "context": "Expected total revenue from a customer"},
      {"acronym": "PLG", "expansion": "Product-Led Growth", "context": "Go-to-market strategy"},
      {"acronym": "CSM", "expansion": "Customer Success Manager", "context": "Post-sale relationship owner"},
      {"acronym": "QBR", "expansion": "Quarterly Business Review", "context": "Structured account health check"}
    ],
    "kpis": [
      {"name": "Pipeline Coverage Ratio", "definition": "Weighted pipeline divided by remaining quota", "typical_range": "3x-4x for mid-market"},
      {"name": "Average Sales Cycle Length", "definition": "Days from opportunity creation to close", "typical_range": "45-90 days mid-market"},
      {"name": "Win Rate", "definition": "Closed-won divided by total closed opportunities", "typical_range": "20-35% for competitive deals"},
      {"name": "Rep Ramp Time", "definition": "Months until a new hire carries full quota", "typical_range": "4-6 months mid-market"},
      {"name": "Activity-to-Meeting Ratio", "definition": "Outbound activities per meeting booked", "typical_range": "50-80 activities per meeting"},
      {"name": "Net Dollar Retention", "definition": "Revenue retained plus expansion minus churn", "typical_range": "105-120% for strong SaaS"},
      {"name": "CAC Payback Period", "definition": "Months to recover acquisition cost", "typical_range": "12-18 months"},
      {"name": "Quota Attainment", "definition": "Percentage of reps hitting quota", "typical_range": "50-65% of reps at or above"}
    ]
  }'::jsonb,

  -- objection_patterns
  '[
    {
      "trigger_condition": "The rep pitches features without asking about current workflow",
      "objection_text": "Look, we already have something that does this. What makes you different from the five other vendors who called me this month?",
      "severity": 3,
      "ideal_response_framework": "Acknowledge the market noise, ask specifically what they use today and what gaps they see",
      "follow_up_if_handled_well": "Fair enough. We use [competitor] but there are a couple of things that frustrate us. Tell me more about how you handle [specific area].",
      "follow_up_if_handled_poorly": "Yeah, thats what they all say. Look, send me a one-pager and Ill take a look when I get a chance."
    },
    {
      "trigger_condition": "Pricing comes up before value is established",
      "objection_text": "Before we go further — what does this actually cost? I need to know if this is even in our budget.",
      "severity": 2,
      "ideal_response_framework": "Acknowledge the question, give a range, then redirect to understanding their needs so you can scope accurately",
      "follow_up_if_handled_well": "OK, thats in the right ballpark. Lets keep going.",
      "follow_up_if_handled_poorly": "So you cant even give me a number? I dont have time for a 6-call sales process to find out the price."
    },
    {
      "trigger_condition": "The rep claims transformational ROI",
      "objection_text": "Everyone says that. Can you show me a customer our size, in our space, who actually got that return? And not a cherry-picked case study.",
      "severity": 4,
      "ideal_response_framework": "Offer a relevant reference customer, propose connecting them directly, share specific metrics not percentages",
      "follow_up_if_handled_well": "Id actually like to speak to that customer. Can you set that up?",
      "follow_up_if_handled_poorly": "Thats a marketing number. Ive been in SaaS long enough to know the difference."
    },
    {
      "trigger_condition": "Integration or technical complexity is mentioned",
      "objection_text": "Our Salesforce instance is heavily customised. Last time we integrated a new tool it took 3 months and broke our lead routing. How painful is this going to be?",
      "severity": 4,
      "ideal_response_framework": "Acknowledge the pain, ask about their specific Salesforce setup, offer a technical scoping call with a solutions engineer",
      "follow_up_if_handled_well": "OK. Id want our Rev Ops lead on the next call to go through the technical side. Can you bring your SE?",
      "follow_up_if_handled_poorly": "Out of the box never means out of the box. I need to think about whether its worth the disruption."
    },
    {
      "trigger_condition": "The rep asks for a meeting or next step too early",
      "objection_text": "Youre asking me to commit a lot of time and I havent even seen if this is relevant yet. Why dont you just show me something?",
      "severity": 2,
      "ideal_response_framework": "Respect the ask, offer a focused 15-minute demo or walkthrough rather than pushing a full meeting",
      "follow_up_if_handled_well": "OK, a 15-minute walkthrough works. But if its not relevant in the first 5, Im cutting it short.",
      "follow_up_if_handled_poorly": "Im not doing a 45-minute demo just so your SDR gets meeting credit. Send me a recording."
    },
    {
      "trigger_condition": "Contract terms or lock-in are discussed",
      "objection_text": "Annual contracts are a hard sell right now. Were being cautious with commitments. Can we do month-to-month until we see results?",
      "severity": 3,
      "ideal_response_framework": "Understand their concern about flexibility, offer a pilot period or quarterly opt-out, explain the annual pricing advantage",
      "follow_up_if_handled_well": "A 90-day pilot with annual conversion if we hit agreed metrics — that could work. Write it up.",
      "follow_up_if_handled_poorly": "We got burned on an annual contract with [competitor] last year. Im not doing that again without a performance clause."
    },
    {
      "trigger_condition": "The rep mentions displacing a competitor",
      "objection_text": "We just renewed with [competitor] for another year. Even if youre better, Im not eating a termination fee to switch.",
      "severity": 5,
      "ideal_response_framework": "Acknowledge the sunk cost, propose running in parallel on a small team, plant seeds for renewal timing",
      "follow_up_if_handled_well": "I could see doing a side-by-side on one team. When does our contract come up? Six months. Lets talk again in four.",
      "follow_up_if_handled_poorly": "Then why are we talking? Call me when our renewal is up."
    },
    {
      "trigger_condition": "The rep fails to demonstrate industry knowledge",
      "objection_text": "Do you actually work with SaaS companies our size? Because that example you just gave sounds like an enterprise use case.",
      "severity": 3,
      "ideal_response_framework": "Pivot to a mid-market specific example, reference their funding stage and typical challenges at that stage",
      "follow_up_if_handled_well": "OK, thats more like it. That sounds like where we are right now.",
      "follow_up_if_handled_poorly": "I thought so. Im not going to be your first mid-market customer and deal with all the growing pains."
    },
    {
      "trigger_condition": "Stakeholder alignment or internal buy-in comes up",
      "objection_text": "I might see the value but my VP Finance will ask why we need another tool when headcount is frozen. Help me build that case.",
      "severity": 4,
      "ideal_response_framework": "Offer to help build the internal business case, provide ROI calculator, offer to join an internal presentation",
      "follow_up_if_handled_well": "If you can help me put together a one-page business case with real numbers, Id bring it to our next leadership sync.",
      "follow_up_if_handled_poorly": "I appreciate that but I cant fight this battle internally without more ammunition than what youve given me."
    },
    {
      "trigger_condition": "Data security or compliance is raised",
      "objection_text": "Where does our data sit? We had a vendor last year who was storing customer data outside the region. Its a board-level concern now.",
      "severity": 4,
      "ideal_response_framework": "Be specific about data residency, certifications (SOC2, ISO), offer to share the security whitepaper and connect with your security team",
      "follow_up_if_handled_well": "Send me your SOC 2 Type II report and your data processing agreement. Ill loop in our security lead.",
      "follow_up_if_handled_poorly": "If you cant tell me where my data is stored right now, we have a problem."
    }
  ]'::jsonb,

  -- discovery_frameworks
  '{
    "primary_framework": "MEDDPICC",
    "framework_mapping": {
      "cold_call": [
        "What does your current sales tech stack look like?",
        "How are you measuring rep performance today?",
        "What is your biggest headache this quarter?"
      ],
      "discovery": [
        "Walk me through how a deal moves from SDR handoff to close today.",
        "What does your onboarding process look like for new reps?",
        "How do you identify which reps need coaching and on what?",
        "Who else would need to be involved in evaluating something like this?",
        "Whats the decision process for new tools — is there a procurement cycle?"
      ],
      "evaluation": [
        "What does success look like 6 months after implementing this?",
        "What are the must-have integrations vs nice-to-haves?",
        "Whats your timeline for making a decision?",
        "What would make you say no even if the product is right?"
      ],
      "negotiation": [
        "What budget range has been approved for this?",
        "Are there other solutions still in the running?",
        "What are the terms that would make this a yes today?"
      ]
    },
    "decision_criteria_hierarchy": [
      "Integration depth with existing CRM",
      "Time to value (sub-30-day implementation)",
      "Measurable impact on rep quota attainment",
      "Security and compliance posture",
      "Pricing flexibility for growth-stage company"
    ]
  }'::jsonb,

  -- compliance_flags
  '[
    {
      "regulation": "SOC 2 Type II",
      "description": "Service Organisation Control audit for data security, availability, and confidentiality",
      "when_buyer_raises_it": "When discussing data handling, early in evaluation, or when security/IT joins the call",
      "rep_should_know": "Whether your company has SOC 2 Type II certification, when it was last audited, and where to find the report. Not having this is a dealbreaker for most Series B+ companies."
    },
    {
      "regulation": "GDPR",
      "description": "EU General Data Protection Regulation governing personal data",
      "when_buyer_raises_it": "When the buyer has EU customers or employees, or when discussing CRM data syncing",
      "rep_should_know": "Data processing agreement availability, data residency options, sub-processor list, and right-to-erasure support."
    },
    {
      "regulation": "CCPA / CPRA",
      "description": "California Consumer Privacy Act and its amendment",
      "when_buyer_raises_it": "When the buyer sells to California consumers or has California-based employees",
      "rep_should_know": "Whether your platform supports data deletion requests, opt-out mechanisms, and data sale disclosures."
    }
  ]'::jsonb,

  -- call_stage_behaviours
  '{
    "cold_call": {
      "buyer_mood": "Mildly annoyed — you were in the middle of something",
      "patience_level": 2,
      "time_to_hang_up": "30-45 seconds",
      "what_earns_more_time": "Mentioning something specific about their company, referencing a trigger event like a funding round or new hire, or stating a pain point that resonates immediately"
    },
    "discovery": {
      "openness": "Moderate — willing to share but testing whether the rep is worth their time",
      "information_sharing_willingness": "Will answer direct questions but wont volunteer information unless the rep earns it with good questions",
      "test_questions_buyer_asks": [
        "How is this different from what we already have?",
        "Who else in our space uses this?",
        "What does implementation actually look like — not the sales version, the real version?"
      ]
    },
    "evaluation": {
      "stakeholders_involved": ["VP Sales (executive sponsor)", "Head of Rev Ops (technical evaluator)", "IT Security (compliance check)"],
      "proof_points_demanded": ["Customer reference in similar segment", "Integration demo with their specific Salesforce config", "ROI model with their actual numbers"],
      "competitive_mentions": ["Gong", "Outreach", "Salesloft", "Clari"]
    },
    "negotiation": {
      "procurement_involvement": "Yes — finance reviews all annual commitments over $20K",
      "discount_expectations": "15-25% off list for annual commitment, more for multi-year",
      "timeline_pressure": "End of quarter if budget exists, otherwise next fiscal year planning cycle",
      "decision_blockers": ["Legal review of MSA and DPA", "Security questionnaire completion", "CFO sign-off on anything over $50K ACV"]
    }
  }'::jsonb,

  -- pricing_sensitivity_profile
  '{
    "budget_holder_title": "VP Sales or CRO, with CFO approval above $50K",
    "typical_budget_range": "$20K-$80K ACV depending on seat count and feature tier",
    "procurement_process_length_days": 30,
    "discount_tolerance_pct": 20,
    "red_flag_phrases": [
      "This will pay for itself immediately",
      "We dont negotiate on price",
      "You need to decide by Friday",
      "I can only hold this pricing until end of month",
      "Our competitors charge twice as much"
    ]
  }'::jsonb,

  -- buying_committee_structure
  '[
    {
      "role": "Executive Sponsor",
      "title_examples": ["VP Sales", "CRO", "Head of GTM"],
      "influence_level": "decision_maker",
      "enters_at_stage": "discovery",
      "typical_concerns": ["Revenue impact", "Time to ROI", "Strategic alignment with company goals"],
      "how_to_win_them": "Speak their language: ARR impact, rep productivity gains, competitive advantage. Never demo features without connecting to business outcomes."
    },
    {
      "role": "Technical Evaluator",
      "title_examples": ["Head of Revenue Operations", "Sales Ops Manager", "CRM Admin"],
      "influence_level": "influencer",
      "enters_at_stage": "evaluation",
      "typical_concerns": ["Integration complexity", "Data model compatibility", "Maintenance burden", "Migration effort"],
      "how_to_win_them": "Be technically honest. Show the API docs. Acknowledge known limitations before they find them. Offer a sandbox they can test."
    },
    {
      "role": "End User Champion",
      "title_examples": ["Sales Manager", "Senior AE", "Team Lead"],
      "influence_level": "champion",
      "enters_at_stage": "evaluation",
      "typical_concerns": ["Daily usability", "Whether reps will actually adopt it", "Coaching workflow quality"],
      "how_to_win_them": "Let them use the product. Show the rep-facing experience, not just dashboards. Make them feel like the hero who found the tool."
    },
    {
      "role": "Finance Gatekeeper",
      "title_examples": ["CFO", "VP Finance", "Financial Controller"],
      "influence_level": "blocker",
      "enters_at_stage": "negotiation",
      "typical_concerns": ["Total cost of ownership", "Payment terms", "Exit clauses", "Headcount vs tool spend tradeoff"],
      "how_to_win_them": "Have a clear ROI model with conservative assumptions. Offer flexible payment terms. Show that the tool reduces need for headcount, not adds to overhead."
    }
  ]'::jsonb
),

-- ============================================================
-- Fintech: Selling to regulated financial services
-- ============================================================
(
  gen_random_uuid(),
  'fintech',
  'Financial Services & Fintech',

  -- buyer_personas
  '[
    {
      "title": "Chief Compliance Officer",
      "seniority": "C-Suite",
      "reports_to": "CEO or Board Audit Committee",
      "priorities": ["Regulatory adherence", "Audit readiness", "Reducing manual compliance processes", "Horizon scanning for new regulations"],
      "skepticisms": ["Will this create more regulatory risk than it solves?", "How do you handle regulatory change?", "We cant be your beta testers"],
      "communication_style": "Cautious, precise, wants everything documented, asks about edge cases",
      "stage_involvement": {
        "discovery": "Will take a call if you reference a specific regulation they are working on. Wants to know who else in financial services uses it.",
        "evaluation": "Deeply involved. Will test against real compliance scenarios. Involves legal counsel. Requires SOC 2 and penetration test reports.",
        "negotiation": "Signs off on compliance and data handling clauses. Will block a deal over a single unacceptable data residency term."
      }
    },
    {
      "title": "Head of Engineering / CTO",
      "seniority": "C-Suite",
      "reports_to": "CEO",
      "priorities": ["System reliability", "API performance", "Reducing vendor lock-in", "Build vs buy decisions"],
      "skepticisms": ["Our engineers could build this in a quarter", "Another vendor API that goes down on Black Friday", "Lock-in through proprietary data formats"],
      "communication_style": "Technical, direct, skeptical of vendor claims, wants to see the architecture diagram",
      "stage_involvement": {
        "discovery": "Joins if the problem is in their domain. Immediately asks about uptime SLAs, latency, and throughput.",
        "evaluation": "Runs load tests. Reviews API documentation. Checks for single points of failure.",
        "negotiation": "Negotiates SLA terms, source code escrow, and migration support guarantees."
      }
    },
    {
      "title": "VP of Product",
      "seniority": "VP",
      "reports_to": "CEO or CPO",
      "priorities": ["Speed to market", "Customer experience", "Reducing integration overhead", "Competitive feature parity"],
      "skepticisms": ["Will this slow down our release cadence?", "How does this interact with our existing payment flows?", "What happens when we need customisation?"],
      "communication_style": "Strategic, customer-focused, thinks in terms of user journeys and competitive differentiation",
      "stage_involvement": {
        "discovery": "Interested if the product unblocks a roadmap item. Thinks about build vs buy.",
        "evaluation": "Evaluates UX, documentation quality, SDK ergonomics. Gets frustrated by poor developer experience.",
        "negotiation": "Pushes for roadmap commitments and early access programmes."
      }
    },
    {
      "title": "Head of Risk / Risk Manager",
      "seniority": "Director",
      "reports_to": "CRO (Chief Risk Officer) or CCO",
      "priorities": ["Third-party vendor risk", "Operational resilience", "Data lineage and auditability", "Incident response preparedness"],
      "skepticisms": ["What is your business continuity plan?", "Who else has access to our data?", "What happens if you go bankrupt?"],
      "communication_style": "Methodical, risk-focused, wants worst-case scenarios addressed before best-case benefits",
      "stage_involvement": {
        "discovery": "Rarely on discovery. Enters during evaluation to run vendor risk assessment.",
        "evaluation": "Fills out vendor risk scorecard. Demands penetration test results, DR plan, insurance certificates.",
        "negotiation": "Requires specific indemnification clauses and liability caps."
      }
    }
  ]'::jsonb,

  -- vocabulary
  '{
    "terms": [
      {"term": "KYC", "definition": "Know Your Customer — identity verification process", "usage_example": "Our KYC onboarding takes 3 days and we lose 15% of applicants", "common_misuse": "Using KYC interchangeably with AML — KYC is one component of AML"},
      {"term": "AML", "definition": "Anti-Money Laundering", "usage_example": "We need to file SARs within 24 hours of detection", "common_misuse": "Treating AML as purely a technology problem when it requires trained compliance staff"},
      {"term": "PSD2", "definition": "Payment Services Directive 2 — EU regulation for payment services", "usage_example": "PSD2 opened the door for open banking but also raised our SCA requirements", "common_misuse": "Assuming PSD2 only applies to banks — it covers all payment service providers"},
      {"term": "SCA", "definition": "Strong Customer Authentication", "usage_example": "SCA adds friction to checkout but its regulatory requirement", "common_misuse": "Thinking 3DS is the only way to achieve SCA compliance"},
      {"term": "Open Banking", "definition": "Framework allowing third-party access to bank data via APIs", "usage_example": "We use open banking APIs for account verification instead of micro-deposits", "common_misuse": "Conflating open banking with screen scraping or legacy aggregation"},
      {"term": "Ledger", "definition": "Authoritative record of all financial transactions", "usage_example": "Every transaction must be double-entry posted to the general ledger", "common_misuse": "Using ledger loosely to mean any database of transactions"},
      {"term": "Settlement", "definition": "The actual transfer of funds between parties", "usage_example": "Settlement takes T+1 for card payments in the UK", "common_misuse": "Confusing authorization with settlement — authorized is not settled"},
      {"term": "Float", "definition": "Money in transit between settlement stages", "usage_example": "Managing float is critical when processing $2M in daily transactions", "common_misuse": "Ignoring float as a treasury and cash flow management concern"},
      {"term": "SAR", "definition": "Suspicious Activity Report", "usage_example": "We filed 47 SARs last quarter, up from 30", "common_misuse": "Thinking SARs are optional — failure to file is a criminal offence"},
      {"term": "Sanctions screening", "definition": "Checking transactions and entities against government sanctions lists", "usage_example": "Sanctions screening must happen in real-time for wire transfers", "common_misuse": "Only screening at onboarding and not on an ongoing basis"},
      {"term": "Regulatory capital", "definition": "Capital reserves required by regulators to cover potential losses", "usage_example": "This feature helps reduce our regulatory capital requirements by improving risk modelling", "common_misuse": "Treating regulatory capital as the same as working capital"},
      {"term": "Basis points", "definition": "One hundredth of a percentage point (0.01%)", "usage_example": "Interchange is 150 basis points on credit, 30 bps on debit", "common_misuse": "Saying percent when you mean basis points — 50bps is 0.5% not 50%"},
      {"term": "TPP", "definition": "Third Party Provider under PSD2/open banking", "usage_example": "We are a registered TPP with the FCA", "common_misuse": "Not understanding the difference between AISP and PISP categories of TPP"},
      {"term": "Interchange", "definition": "Fee paid between acquiring and issuing bank per card transaction", "usage_example": "Interchange caps under IFR keep our card acceptance costs predictable", "common_misuse": "Thinking interchange goes to the card network rather than the issuer"},
      {"term": "Run book", "definition": "Documented procedure for handling operational scenarios", "usage_example": "We need to update our incident run book for the new payment rail", "common_misuse": "Having a run book that is never tested or updated"}
    ],
    "acronyms": [
      {"acronym": "KYC", "expansion": "Know Your Customer", "context": "Identity verification at onboarding"},
      {"acronym": "AML", "expansion": "Anti-Money Laundering", "context": "Ongoing monitoring and reporting framework"},
      {"acronym": "PSD2", "expansion": "Payment Services Directive 2", "context": "EU payment regulation"},
      {"acronym": "SCA", "expansion": "Strong Customer Authentication", "context": "Two-factor requirement for electronic payments"},
      {"acronym": "FCA", "expansion": "Financial Conduct Authority", "context": "UK financial regulator"},
      {"acronym": "PCI DSS", "expansion": "Payment Card Industry Data Security Standard", "context": "Card data handling requirements"},
      {"acronym": "SAR", "expansion": "Suspicious Activity Report", "context": "Required filing for suspicious transactions"},
      {"acronym": "BCP", "expansion": "Business Continuity Plan", "context": "Operational resilience documentation"},
      {"acronym": "DR", "expansion": "Disaster Recovery", "context": "Systems and data recovery procedures"},
      {"acronym": "MiFID II", "expansion": "Markets in Financial Instruments Directive II", "context": "EU regulation for investment services"},
      {"acronym": "DORA", "expansion": "Digital Operational Resilience Act", "context": "EU regulation for ICT risk management in financial services"}
    ],
    "kpis": [
      {"name": "Transaction Success Rate", "definition": "Percentage of attempted transactions that complete successfully", "typical_range": "97-99.5% depending on payment method"},
      {"name": "KYC Onboarding Pass Rate", "definition": "Percentage of applicants who complete identity verification", "typical_range": "75-90% depending on market and risk appetite"},
      {"name": "False Positive Rate (AML)", "definition": "Percentage of flagged transactions that are actually legitimate", "typical_range": "90-98% — high false positives are a major operational burden"},
      {"name": "Time to Settlement", "definition": "Hours or days from transaction to funds availability", "typical_range": "T+0 to T+3 depending on payment rail"},
      {"name": "API Uptime", "definition": "Percentage availability of payment and data APIs", "typical_range": "99.95-99.99% SLA for critical payment infrastructure"},
      {"name": "Regulatory Findings", "definition": "Number of issues identified in regulatory examinations", "typical_range": "Zero is the target — any finding is a serious event"},
      {"name": "Customer Onboarding Time", "definition": "Days from application to fully active account", "typical_range": "Same-day for low-risk, 5-10 days for high-risk customers"},
      {"name": "Cost Per Transaction", "definition": "Fully loaded cost including interchange, processing, compliance", "typical_range": "Varies widely: 0.5-3% for card, 0.1-0.5% for bank-to-bank"}
    ]
  }'::jsonb,

  -- objection_patterns
  '[
    {
      "trigger_condition": "The rep does not mention specific regulatory frameworks",
      "objection_text": "We are FCA-regulated. Everything we do has to pass compliance review. Do you understand what that means for us?",
      "severity": 5,
      "ideal_response_framework": "Demonstrate specific knowledge of FCA requirements, reference your existing regulated clients, offer to share your compliance documentation",
      "follow_up_if_handled_well": "OK, you clearly know our world. Who else in UK financial services uses this?",
      "follow_up_if_handled_poorly": "I dont think you understand what selling into a regulated environment means. This conversation is over."
    },
    {
      "trigger_condition": "Data residency or sovereignty is not addressed proactively",
      "objection_text": "Where exactly is our data stored? We have customers in the EU, UK, and Singapore. We need data residency guarantees per jurisdiction.",
      "severity": 5,
      "ideal_response_framework": "Specify exact data centre locations, explain tenancy model, confirm DPA terms per jurisdiction",
      "follow_up_if_handled_well": "Send me the DPA and the data residency addendum. Ill get our DPO to review.",
      "follow_up_if_handled_poorly": "If you cant tell me exactly where my customer data sits, I cant even consider this."
    },
    {
      "trigger_condition": "The rep pushes for a fast timeline",
      "objection_text": "You need to understand — our procurement process for regulated vendors takes 90 days minimum. Theres a vendor risk assessment, security review, legal review, and board approval. Thats not negotiable.",
      "severity": 3,
      "ideal_response_framework": "Acknowledge the timeline, ask what you can prepare in advance, offer to pre-fill their vendor risk questionnaire",
      "follow_up_if_handled_well": "If you can pre-fill our vendor risk assessment — I will send you the template — that would actually speed things up.",
      "follow_up_if_handled_poorly": "Every vendor thinks theyre the exception to our process. Youre not."
    },
    {
      "trigger_condition": "Uptime or reliability is not addressed",
      "objection_text": "We process payments 24/7. A 15-minute outage costs us six figures. What is your uptime guarantee and what happens when you miss it?",
      "severity": 5,
      "ideal_response_framework": "Share your SLA numbers, explain your redundancy architecture, detail your incident response process and compensation terms",
      "follow_up_if_handled_well": "Whats your RTO and RPO? Send me your DR documentation and last 12 months of uptime data.",
      "follow_up_if_handled_poorly": "99.9% uptime means 8.7 hours of downtime a year. In payments, that is catastrophic. You need five nines or dont bother."
    },
    {
      "trigger_condition": "The rep suggests replacing an existing system",
      "objection_text": "You are asking us to rip out infrastructure that has been working for three years and is deeply embedded in our transaction flow. The migration risk alone is a non-starter.",
      "severity": 4,
      "ideal_response_framework": "Propose a phased migration, suggest running in parallel, offer migration support and rollback guarantees",
      "follow_up_if_handled_well": "A parallel run on non-critical flows first — thats the only way this happens. Can you support that?",
      "follow_up_if_handled_poorly": "We are not ripping and replacing mission-critical infrastructure on a vendors timeline."
    },
    {
      "trigger_condition": "The rep does not understand the build vs buy tension",
      "objection_text": "My engineering team says they can build this in two sprints. Why should I pay you a six-figure annual fee for something we could own?",
      "severity": 4,
      "ideal_response_framework": "Acknowledge the engineering capability, quantify the hidden costs (maintenance, compliance updates, on-call), highlight the regulatory change management burden",
      "follow_up_if_handled_well": "Thats a fair point about regulatory maintenance. Our team spent 400 hours on PSD2 SCA changes alone last year.",
      "follow_up_if_handled_poorly": "We have built harder things than this. I think youre overcomplicating it."
    },
    {
      "trigger_condition": "Audit or examination readiness comes up",
      "objection_text": "We have an FCA visit in four months. Any new system needs to be audit-ready or it creates more risk than it solves. Can you guarantee audit trail completeness?",
      "severity": 5,
      "ideal_response_framework": "Detail your audit logging capabilities, show an example audit report, explain how your system supports regulatory examination requests",
      "follow_up_if_handled_well": "Can you show me an example audit export? Our compliance team would need to validate the format.",
      "follow_up_if_handled_poorly": "If I cant pull a complete audit trail for any transaction within 24 hours, the FCA will have questions I dont want to answer."
    },
    {
      "trigger_condition": "Third-party or sub-processor risk is raised",
      "objection_text": "Who are your sub-processors? If you use AWS and they have an incident, that is still our problem in the eyes of the regulator. We need full transparency on your supply chain.",
      "severity": 4,
      "ideal_response_framework": "Share your sub-processor list, explain your vendor management programme, detail notification procedures for sub-processor changes",
      "follow_up_if_handled_well": "Send me the sub-processor list and your incident notification SLA. I need to run it through our third-party risk framework.",
      "follow_up_if_handled_poorly": "The fact that you had to look that up concerns me."
    },
    {
      "trigger_condition": "The rep talks about AI or machine learning features",
      "objection_text": "AI in financial services is a regulatory minefield. Is your model explainable? Can we demonstrate to the FCA why a decision was made? Black box is not acceptable.",
      "severity": 4,
      "ideal_response_framework": "Explain model explainability, detail how decisions are logged and auditable, reference any regulatory guidance you follow on AI governance",
      "follow_up_if_handled_well": "If you can show us the explainability framework and how it maps to the FCAs AI principles, thats a conversation worth having.",
      "follow_up_if_handled_poorly": "We cannot use a system that makes decisions we cannot explain to our regulator."
    },
    {
      "trigger_condition": "Pricing does not reflect the complexity of financial services",
      "objection_text": "Your per-transaction pricing model does not work for us. We process 2 million transactions a month. At your stated rate that is more than our entire compliance teams salary budget.",
      "severity": 3,
      "ideal_response_framework": "Acknowledge the volume, offer volume-tiered pricing, discuss enterprise licensing models",
      "follow_up_if_handled_well": "Give me a volume pricing proposal for 2M transactions with a growth clause. Ill take it to finance.",
      "follow_up_if_handled_poorly": "If your pricing model doesnt scale, your product doesnt work for financial services. Full stop."
    }
  ]'::jsonb,

  -- discovery_frameworks
  '{
    "primary_framework": "MEDDPICC",
    "framework_mapping": {
      "cold_call": [
        "What regulatory changes are keeping you up at night?",
        "How are you handling [specific regulation] compliance today?",
        "Who owns vendor risk assessment in your organisation?"
      ],
      "discovery": [
        "Walk me through your current compliance workflow from detection to resolution.",
        "How many manual hours per week go into regulatory reporting?",
        "What happened at your last regulatory examination — any findings?",
        "Who needs to approve a new regulated vendor? What does that process look like?",
        "What is your current false positive rate on AML screening and what does that cost you?"
      ],
      "evaluation": [
        "What does your vendor risk assessment framework require?",
        "Who from your security and compliance team should be in the next conversation?",
        "What are the non-negotiable technical requirements — data residency, uptime SLA, audit trail format?",
        "What would make you confident enough to take this to the board?"
      ],
      "negotiation": [
        "What is the budget envelope that has been approved?",
        "What contract terms are non-negotiable for your legal team?",
        "Is there a board meeting date we need to align to for approval?"
      ]
    },
    "decision_criteria_hierarchy": [
      "Regulatory compliance and audit readiness",
      "Data residency and sovereignty guarantees",
      "Uptime SLA and operational resilience",
      "Integration with existing banking infrastructure",
      "Total cost at scale (volume pricing)"
    ]
  }'::jsonb,

  -- compliance_flags
  '[
    {
      "regulation": "FCA Consumer Duty",
      "description": "Requires firms to act to deliver good outcomes for retail customers including on price, product suitability, and support",
      "when_buyer_raises_it": "When discussing how the tool affects end-customer outcomes or when the buyer mentions product governance",
      "rep_should_know": "Consumer Duty is the FCAs top priority. Any tool that touches customer interactions must demonstrably support good customer outcomes. The rep should know whether their product has been assessed against Consumer Duty requirements."
    },
    {
      "regulation": "DORA (Digital Operational Resilience Act)",
      "description": "EU regulation requiring financial entities to manage ICT risk, test resilience, and report ICT-related incidents",
      "when_buyer_raises_it": "When discussing vendor dependency, business continuity, or when the buyer operates in the EU",
      "rep_should_know": "DORA came into force January 2025. Financial firms must now classify critical ICT third-party providers and may need to include specific contractual provisions. The rep should know how their platform supports DORA compliance."
    },
    {
      "regulation": "PCI DSS v4.0",
      "description": "Updated payment card security standard with new requirements for authentication and encryption",
      "when_buyer_raises_it": "When discussing any system that touches cardholder data, even indirectly through tokenisation or API calls",
      "rep_should_know": "PCI DSS v4.0 has been mandatory since March 2025. Key changes include mandatory MFA for all access to cardholder data environments and enhanced logging requirements. The rep must know their own PCI compliance level."
    },
    {
      "regulation": "Senior Managers and Certification Regime (SM&CR)",
      "description": "FCA regime making senior individuals personally accountable for compliance failures in their area",
      "when_buyer_raises_it": "When the buyer is personally responsible for compliance outcomes and wants to understand their liability exposure",
      "rep_should_know": "SM&CR means the CCO or CTO is personally liable if a vendor they approved causes a compliance failure. This is why fintech sales cycles are long and why compliance sign-off is non-negotiable."
    }
  ]'::jsonb,

  -- call_stage_behaviours
  '{
    "cold_call": {
      "buyer_mood": "Guarded — financial services professionals do not take unsolicited vendor calls lightly",
      "patience_level": 1,
      "time_to_hang_up": "15-20 seconds",
      "what_earns_more_time": "Referencing a specific regulation they are working on, mentioning a peer firm that uses you, demonstrating you understand the difference between a bank and a fintech"
    },
    "discovery": {
      "openness": "Low to moderate — will share challenges but not detailed processes or data without NDA",
      "information_sharing_willingness": "Guarded. Will not discuss specific compliance gaps or audit findings until trust is established. May require NDA before deep technical discussion.",
      "test_questions_buyer_asks": [
        "Are you FCA-regulated or FCA-registered?",
        "Who is your Data Protection Officer?",
        "Can you share your last penetration test executive summary?",
        "What happens to our data if your company is acquired?"
      ]
    },
    "evaluation": {
      "stakeholders_involved": ["CCO (compliance sign-off)", "CTO/Head of Engineering (technical evaluation)", "Head of Risk (vendor risk assessment)", "DPO (data protection review)"],
      "proof_points_demanded": ["SOC 2 Type II report", "Penetration test results (last 12 months)", "Completed vendor risk questionnaire", "Data processing agreement with jurisdiction-specific terms", "Customer reference from a similarly regulated firm"],
      "competitive_mentions": ["ComplyAdvantage", "Onfido", "Plaid", "TrueLayer", "Marqeta"]
    },
    "negotiation": {
      "procurement_involvement": "Mandatory — regulated firms have formal procurement processes for all technology vendors",
      "discount_expectations": "10-15% for annual commitment, but pricing must be predictable at scale",
      "timeline_pressure": "Regulatory deadlines drive urgency more than commercial pressure. If a regulation has a compliance date, that accelerates everything.",
      "decision_blockers": ["Incomplete security documentation", "Unresolved data residency questions", "Missing regulatory certification", "Board approval for vendors over threshold", "Legal review of liability and indemnification clauses"]
    }
  }'::jsonb,

  -- pricing_sensitivity_profile
  '{
    "budget_holder_title": "CTO or CFO, with board approval for engagements above £100K",
    "typical_budget_range": "£50K-£250K ACV for compliance and infrastructure tooling",
    "procurement_process_length_days": 90,
    "discount_tolerance_pct": 15,
    "red_flag_phrases": [
      "Sign today and I can get you 40% off",
      "We are raising prices next month",
      "Our platform is SOC 2 compliant — or equivalent",
      "Data residency is configurable — we think",
      "We can have you live in two weeks"
    ]
  }'::jsonb,

  -- buying_committee_structure
  '[
    {
      "role": "Compliance Decision Maker",
      "title_examples": ["Chief Compliance Officer", "Head of Regulatory Affairs", "MLRO"],
      "influence_level": "decision_maker",
      "enters_at_stage": "discovery",
      "typical_concerns": ["Regulatory risk", "Audit trail completeness", "Regulator relationship impact", "Personal liability under SM&CR"],
      "how_to_win_them": "Demonstrate deep regulatory knowledge. Show you have been through FCA examinations with other clients. Never oversimplify compliance — they will test you."
    },
    {
      "role": "Technical Gatekeeper",
      "title_examples": ["CTO", "Head of Engineering", "VP Infrastructure"],
      "influence_level": "blocker",
      "enters_at_stage": "evaluation",
      "typical_concerns": ["Uptime and reliability", "API design quality", "Vendor lock-in", "Migration complexity", "Operational resilience"],
      "how_to_win_them": "Lead with architecture. Share your status page. Be honest about limitations. Offer a sandbox environment for their engineers to test."
    },
    {
      "role": "Risk Assessor",
      "title_examples": ["Head of Operational Risk", "Risk Manager", "Third-Party Risk Lead"],
      "influence_level": "blocker",
      "enters_at_stage": "evaluation",
      "typical_concerns": ["Third-party risk score", "Business continuity", "Sub-processor transparency", "Insurance and liability"],
      "how_to_win_them": "Pre-fill their vendor risk questionnaire. Have your SOC 2, pen test, and BCP documents ready before they ask. Show you have done this before with regulated firms."
    },
    {
      "role": "Product Champion",
      "title_examples": ["VP Product", "Head of Payments", "Product Manager"],
      "influence_level": "champion",
      "enters_at_stage": "discovery",
      "typical_concerns": ["Time to market", "Developer experience", "Customisation flexibility", "Roadmap alignment"],
      "how_to_win_them": "Show them the developer documentation. Let them evaluate SDK quality. Share your public roadmap. Give them early access to new features so they become your internal advocate."
    }
  ]'::jsonb
),

-- ============================================================
-- Recruitment: Selling to staffing agencies and in-house talent
-- ============================================================
(
  gen_random_uuid(),
  'recruitment',
  'Recruitment & Staffing',

  -- buyer_personas
  '[
    {
      "title": "Managing Director / Agency Owner",
      "seniority": "C-Suite",
      "reports_to": "Board or shareholders",
      "priorities": ["Net fee income growth", "Consultant productivity", "Margin protection against rate compression", "Winning PSL positions"],
      "skepticisms": ["Another tech vendor who doesnt understand billings", "Will my consultants actually use it?", "How does this help me win more PSL tenders?"],
      "communication_style": "Direct, commercially focused, thinks in terms of margin and NFI per head, impatient with jargon",
      "stage_involvement": {
        "discovery": "Will take a call if you mention a competitor agency that uses your product or reference a specific PSL they are pitching for.",
        "evaluation": "Delegates to Head of Delivery or Operations Manager but reviews the commercial case. Wants proof of NFI impact.",
        "negotiation": "Owns the budget. Negotiates hard on per-recruiter pricing. Wants cancellation flexibility because headcount fluctuates."
      }
    },
    {
      "title": "Head of Delivery / Operations Director",
      "seniority": "Director",
      "reports_to": "Managing Director",
      "priorities": ["Time-to-fill reduction", "Candidate quality metrics for PSL reporting", "Consultant utilisation rates", "Reducing reliance on job boards"],
      "skepticisms": ["We tried something like this before and the data was rubbish", "Our processes are different from other agencies", "How does this handle contract vs perm differently?"],
      "communication_style": "Process-oriented, wants to see the workflow, asks detailed how questions, focused on operational efficiency",
      "stage_involvement": {
        "discovery": "Primary point of contact for operational tools. Will share current process if you ask the right questions.",
        "evaluation": "Runs the pilot. Tests against real requisitions. Measures impact on time-to-fill and submission-to-interview ratio.",
        "negotiation": "Advises the MD on operational value. Pushes for implementation support and data migration."
      }
    },
    {
      "title": "Head of Talent Acquisition (In-House)",
      "seniority": "Director",
      "reports_to": "CHRO or VP People",
      "priorities": ["Reducing agency spend", "Employer brand", "Candidate experience scores", "Diversity hiring targets", "Internal mobility"],
      "skepticisms": ["I already have an ATS — why do I need another tool?", "Our hiring managers dont use what we already have", "Will this integrate with Workday?"],
      "communication_style": "People-focused, data-informed but not data-obsessed, cares about candidate and hiring manager experience",
      "stage_involvement": {
        "discovery": "Open to new approaches if you understand the difference between agency and in-house challenges. Tests whether you know what cost-per-hire actually includes.",
        "evaluation": "Involves HRIS team for integration check. Tests against current ATS workflow. Asks about candidate-facing experience.",
        "negotiation": "Budget comes from People function. Needs CHRO sign-off for anything over £30K. Procurement involved for enterprise."
      }
    },
    {
      "title": "Recruitment Team Lead / Senior Consultant",
      "seniority": "Manager",
      "reports_to": "Head of Delivery or MD",
      "priorities": ["Hitting personal and team billings targets", "Candidate pipeline depth", "Speed — anything that saves admin time", "Not losing candidates to competitors"],
      "skepticisms": ["If this slows me down even a little I wont use it", "My spreadsheet works fine", "Will this replace my job?"],
      "communication_style": "Fast-paced, results-oriented, speaks in terms of billings and placements, allergic to admin overhead",
      "stage_involvement": {
        "discovery": "Sometimes brought in as a potential pilot user. Gives unfiltered feedback about what tools they actually use vs ignore.",
        "evaluation": "The real test — if the team lead doesnt adopt it, the tool is dead. Tests it against live roles.",
        "negotiation": "No budget authority but their buy-in is essential. The MD will ask them if they like it."
      }
    }
  ]'::jsonb,

  -- vocabulary
  '{
    "terms": [
      {"term": "NFI", "definition": "Net Fee Income — gross margin on placements after paying the candidate or contractor", "usage_example": "We need to hit £2.4M NFI this year to make our growth target", "common_misuse": "Confusing NFI with revenue — a £100K placement at 20% margin is £20K NFI not £100K"},
      {"term": "PSL", "definition": "Preferred Supplier List — approved agencies for a client", "usage_example": "We lost the Barclays PSL last year and it cost us £400K in annual billings", "common_misuse": "Treating PSL as a permanent position — most are reviewed annually or biannually"},
      {"term": "Time-to-fill", "definition": "Days from requisition opening to offer acceptance", "usage_example": "Our average time-to-fill for tech roles is 38 days, down from 52", "common_misuse": "Measuring from first candidate submission rather than req opening"},
      {"term": "Billings", "definition": "Total invoiced fees to clients from placements", "usage_example": "Our top consultant billed £380K last year", "common_misuse": "Using billings and revenue interchangeably — billings is the top line, NFI is what matters"},
      {"term": "Spec CV", "definition": "Speculatively sending a candidate CV to a client without a specific role brief", "usage_example": "Spec CVs are how we open doors with new clients — if the candidate is strong enough", "common_misuse": "Thinking spec CVs are spam — done well they demonstrate market knowledge"},
      {"term": "Rate card", "definition": "Agreed pricing structure between agency and client for contract placements", "usage_example": "The client compressed our rate card by 5% at renewal and its killing our margins", "common_misuse": "Assuming rate cards are negotiable after PSL award — they are usually fixed for the contract term"},
      {"term": "IR35", "definition": "UK tax legislation determining whether a contractor is genuinely self-employed or effectively an employee", "usage_example": "Half our contractors fell inside IR35 after the April 2021 changes and we lost 30% of them", "common_misuse": "Thinking IR35 is the agencys problem — since April 2021 the end client makes the determination"},
      {"term": "Backfill", "definition": "Replacing a contractor or employee who has left a role", "usage_example": "Backfill work is reactive but reliable revenue — 40% of our contract billings are backfills", "common_misuse": "Treating backfills as new business when they should be tracked separately for pipeline accuracy"},
      {"term": "Rebate", "definition": "Volume-based discount paid back to the client, usually quarterly", "usage_example": "The 3% rebate on the NHS contract means we need to price 3% higher to maintain margin", "common_misuse": "Not factoring rebates into margin calculations — a 20% margin with a 3% rebate is really 17%"},
      {"term": "Submission-to-interview ratio", "definition": "Number of CVs submitted per interview gained", "usage_example": "A 3:1 submission-to-interview ratio is good — above 5:1 means quality is slipping", "common_misuse": "Optimising for submission volume rather than submission quality"},
      {"term": "Compliance file", "definition": "Full documentation for a contractor: right to work, references, DBS, qualifications", "usage_example": "We cant start a contractor without a complete compliance file — NHS trusts audit this monthly", "common_misuse": "Treating compliance as an admin task rather than a revenue blocker"},
      {"term": "Off-payroll rules", "definition": "UK HMRC rules requiring agencies to deduct tax for contractors deemed inside IR35", "usage_example": "The off-payroll rules mean we now carry the tax risk on inside-IR35 engagements", "common_misuse": "Assuming umbrella companies eliminate IR35 risk — they mitigate it but dont remove it"},
      {"term": "Master vendor", "definition": "Single agency managing all contingent workforce supply for a client, including subcontracting to other agencies", "usage_example": "We are the master vendor on the Lloyds contract which means we also manage 12 second-tier suppliers", "common_misuse": "Confusing master vendor with preferred supplier — master vendor has contractual control over other agencies"},
      {"term": "Warm desk", "definition": "Existing client relationships and active roles that a recruiter inherits or works on", "usage_example": "New starters here get a warm desk with 15 active roles from day one", "common_misuse": "Assuming warm desk means easy — inherited relationships need to be re-earned"},
      {"term": "Candidate control", "definition": "Having a strong enough relationship with a candidate that they work exclusively through you", "usage_example": "If we dont have candidate control, three other agencies are submitting the same person at lower margin", "common_misuse": "Thinking you have candidate control because the candidate is polite — they may be registered with five agencies"}
    ],
    "acronyms": [
      {"acronym": "NFI", "expansion": "Net Fee Income", "context": "Primary profit metric for recruitment agencies"},
      {"acronym": "PSL", "expansion": "Preferred Supplier List", "context": "Client-approved agency panel"},
      {"acronym": "ATS", "expansion": "Applicant Tracking System", "context": "Core recruitment workflow platform"},
      {"acronym": "CRM", "expansion": "Candidate Relationship Management", "context": "Long-term candidate engagement platform"},
      {"acronym": "RPO", "expansion": "Recruitment Process Outsourcing", "context": "Outsourced in-house recruitment model"},
      {"acronym": "MSP", "expansion": "Managed Service Provider", "context": "Vendor management for contingent workforce"},
      {"acronym": "SoW", "expansion": "Statement of Work", "context": "Project-based engagement outside standard contractor terms"},
      {"acronym": "DBS", "expansion": "Disclosure and Barring Service", "context": "Criminal background check required for regulated sectors"},
      {"acronym": "AWR", "expansion": "Agency Workers Regulations", "context": "UK law giving agency workers equal treatment rights after 12 weeks"},
      {"acronym": "REC", "expansion": "Recruitment and Employment Confederation", "context": "UK industry body and compliance standards"}
    ],
    "kpis": [
      {"name": "NFI Per Head", "definition": "Net fee income divided by number of fee-earning consultants", "typical_range": "£80K-£150K per annum for a productive consultant"},
      {"name": "Time-to-Fill", "definition": "Days from requisition to offer acceptance", "typical_range": "20-45 days for standard roles, 60+ for niche or senior"},
      {"name": "Fill Rate", "definition": "Percentage of roles briefed that result in a placement", "typical_range": "15-30% for contingent recruitment, 80%+ for retained"},
      {"name": "Submission-to-Interview Ratio", "definition": "CVs sent per interview achieved", "typical_range": "3:1 good, 5:1 acceptable, above 5:1 needs attention"},
      {"name": "Interview-to-Placement Ratio", "definition": "Interviews per placement made", "typical_range": "3:1 to 5:1 depending on role seniority"},
      {"name": "Contractor Retention Rate", "definition": "Percentage of contractors who complete their engagement", "typical_range": "85-95% — early leavers directly cost margin and client trust"},
      {"name": "Cost-Per-Hire", "definition": "Total recruitment cost divided by number of hires (in-house metric)", "typical_range": "£3K-£8K for volume roles, £15K-£30K for senior/niche"},
      {"name": "Job Board Spend as % of NFI", "definition": "Total job board advertising divided by net fee income", "typical_range": "3-8% — above 10% signals over-reliance on paid sourcing"}
    ]
  }'::jsonb,

  -- objection_patterns
  '[
    {
      "trigger_condition": "The rep does not understand the difference between contract and permanent recruitment economics",
      "objection_text": "Do you know the difference between a perm placement and a contract extension? Because your pricing model seems to treat them the same and they are completely different businesses.",
      "severity": 4,
      "ideal_response_framework": "Demonstrate understanding of perm fees vs contract margin stacking, show how pricing adapts to each model",
      "follow_up_if_handled_well": "OK, you understand the economics. Show me how your tool handles the contract renewal pipeline separately from perm pipeline.",
      "follow_up_if_handled_poorly": "This is basic recruitment finance. If your team doesnt understand our business model, your product wont either."
    },
    {
      "trigger_condition": "The rep suggests the tool will replace recruiters or automate relationship-building",
      "objection_text": "Recruitment is a relationship business. If you think AI is going to replace my consultants picking up the phone and building relationships, you fundamentally misunderstand what we do.",
      "severity": 5,
      "ideal_response_framework": "Position as augmenting not replacing, show how the tool frees up time for relationship-building by removing admin, reference specific tasks it automates",
      "follow_up_if_handled_well": "If it genuinely saves my consultants 2 hours a day on admin so they can make more calls, thats interesting. Show me exactly where the time savings come from.",
      "follow_up_if_handled_poorly": "Every tech vendor says they will save us time and then we spend 3 months implementing and my consultants are still using spreadsheets because your tool adds steps."
    },
    {
      "trigger_condition": "IR35 or off-payroll rules are relevant and the rep does not raise them",
      "objection_text": "Are you aware of IR35 and the off-payroll rules? Because any tool that touches our contractor management needs to handle status determinations and the associated pay rate calculations. This isnt optional.",
      "severity": 5,
      "ideal_response_framework": "Demonstrate knowledge of IR35 inside/outside determination, how the tool supports Status Determination Statements, impact on contractor pay rates",
      "follow_up_if_handled_well": "Good. Can your system flag when a role description changes in a way that might affect the IR35 determination? Thats where agencies get caught out.",
      "follow_up_if_handled_poorly": "If you dont know what IR35 means, your product is not ready for the UK staffing market."
    },
    {
      "trigger_condition": "PSL or preferred supplier dynamics are discussed",
      "objection_text": "We are on 40 PSLs. Each one has different submission requirements, different rate cards, different compliance standards. Can your system handle that or is it one-size-fits-all?",
      "severity": 4,
      "ideal_response_framework": "Show how the tool supports client-specific workflows, configurable rate cards, and PSL-specific compliance templates",
      "follow_up_if_handled_well": "Show me how a consultant would submit a candidate to two different PSL clients with different requirements, using your system, in under 5 minutes.",
      "follow_up_if_handled_poorly": "So I would still need my spreadsheet to track PSL requirements? Then what exactly am I paying you for?"
    },
    {
      "trigger_condition": "Consultant adoption or change management is a concern",
      "objection_text": "I bought an ATS two years ago and my top billers still use their personal spreadsheets. What makes you think your tool will be any different?",
      "severity": 4,
      "ideal_response_framework": "Acknowledge the adoption challenge directly, show how your UX is designed for speed not admin, reference adoption rates at similar agencies, offer a consultant-led pilot",
      "follow_up_if_handled_well": "If your top-billing customers have 80%+ daily active usage, Id like to talk to one of them. Not your customer success team — an actual consultant who uses it.",
      "follow_up_if_handled_poorly": "Ive heard the adoption story before. My consultants bill £300K a year because they move fast. If your tool slows them down by even 10 minutes a day, theyll revolt."
    },
    {
      "trigger_condition": "Rate card compression or margin pressure is mentioned",
      "objection_text": "Our clients are compressing rate cards by 3-5% every renewal cycle. I need tools that help me protect margin, not add to my cost base. How does this help me make more money, not spend more?",
      "severity": 3,
      "ideal_response_framework": "Quantify the margin impact: if the tool increases fill rate by X%, that is Y additional placements at current margin. Show ROI in NFI terms, not feature terms",
      "follow_up_if_handled_well": "If you can show me a credible model for £50K additional NFI from a £15K investment, I will get my FD to look at it.",
      "follow_up_if_handled_poorly": "So it costs me £15K per year and you cant tell me what it earns me? Thats a tough sell to my board."
    },
    {
      "trigger_condition": "Data quality or migration from existing ATS is raised",
      "objection_text": "We have 200,000 candidates in Bullhorn right now. At least half of them have outdated information. What happens when I migrate that mess into your system — garbage in, garbage out?",
      "severity": 3,
      "ideal_response_framework": "Propose a phased migration with data cleansing, offer de-duplication and enrichment during migration, show how the tool handles stale data",
      "follow_up_if_handled_well": "A migration that includes data cleansing and enrichment? Thats actually valuable. What does the timeline look like for 200K records?",
      "follow_up_if_handled_poorly": "So I need to clean the data myself before migrating? Thats a 6-month project I dont have resource for."
    },
    {
      "trigger_condition": "AWR or compliance documentation is relevant",
      "objection_text": "We place contractors into NHS trusts and local government. Compliance is not optional — DBS checks, right to work, qualification verification, AWR tracking. Does your system handle all of that or do I still need a separate compliance tool?",
      "severity": 5,
      "ideal_response_framework": "Detail specific compliance tracking features, show DBS renewal alerting, AWR 12-week trigger tracking, document management for compliance files",
      "follow_up_if_handled_well": "Can it generate a compliance pack for audit purposes? Our NHS clients do spot checks monthly.",
      "follow_up_if_handled_poorly": "Compliance is where agencies get shut down. If your tool doesnt handle this natively, its not a serious recruitment platform."
    },
    {
      "trigger_condition": "The rep suggests a long implementation timeline",
      "objection_text": "Three months to implement? My consultants need to be billing. I cant have a quarter of dead time while we fiddle with a new system. What can we do in two weeks?",
      "severity": 3,
      "ideal_response_framework": "Propose a phased rollout — core features live in 2 weeks, advanced features over 2 months. Show how consultants can bill from day one of the pilot",
      "follow_up_if_handled_well": "Two weeks to get the core live with a parallel run on Bullhorn? That could work. But if anything breaks during go-live, we need same-day support.",
      "follow_up_if_handled_poorly": "My consultants cant not bill for 3 months. Thats £500K in lost NFI. Your implementation timeline is a dealbreaker."
    },
    {
      "trigger_condition": "The rep does not differentiate between agency and in-house recruitment",
      "objection_text": "You keep talking about in-house TA use cases. We are a staffing agency. We place 500 contractors a month and bill clients. Our world is completely different from an in-house team filling 10 roles a quarter.",
      "severity": 4,
      "ideal_response_framework": "Acknowledge the difference immediately, pivot to agency-specific examples, reference contractor management, timesheet, and invoicing workflows",
      "follow_up_if_handled_well": "OK, now youre speaking my language. Show me the contractor lifecycle — from CV submission through to timesheet and invoice.",
      "follow_up_if_handled_poorly": "If your product was built for in-house TA and youre trying to sell it to agencies, we are done here."
    }
  ]'::jsonb,

  -- discovery_frameworks
  '{
    "primary_framework": "SPIN",
    "framework_mapping": {
      "cold_call": [
        "How many fee-earning consultants do you have and whats your current tech stack?",
        "What PSLs are you targeting this quarter?",
        "How are you finding candidate sourcing in the current market?"
      ],
      "discovery": [
        "Walk me through what happens from the moment a consultant gets a new role brief to submitting the first candidate.",
        "What percentage of your billings come from contract vs perm placements?",
        "How are you handling IR35 status determinations at scale?",
        "What does your consultant onboarding look like — how long until a new starter is billing?",
        "Which clients are compressing your rate cards and how are you responding?"
      ],
      "evaluation": [
        "What does your current ATS not do that you wish it did?",
        "Which integrations are non-negotiable — job boards, VMS, payroll?",
        "Who needs to be involved in the decision — is this just ops or does the MD need to sign off?",
        "Whats your timeline — is there a contract renewal date driving this?"
      ],
      "negotiation": [
        "What budget has been allocated for this?",
        "Is the pricing per-consultant or per-desk?",
        "What contract length gives you the confidence to commit?"
      ]
    },
    "decision_criteria_hierarchy": [
      "Speed and ease of use for consultants (adoption is everything)",
      "Contract and compliance workflow support (IR35, AWR, DBS)",
      "Integration with existing job boards and VMS platforms",
      "NFI impact — provable return on investment",
      "Flexible pricing that scales with headcount fluctuation"
    ]
  }'::jsonb,

  -- compliance_flags
  '[
    {
      "regulation": "IR35 / Off-Payroll Working Rules",
      "description": "HMRC legislation requiring end clients and agencies to determine whether contractors are genuinely self-employed or effectively employees for tax purposes",
      "when_buyer_raises_it": "Immediately when discussing any contractor management workflow. This is the single biggest regulatory concern for UK staffing agencies since April 2021.",
      "rep_should_know": "The end client makes the determination, but the agency is liable for incorrect tax deductions. The tool must support Status Determination Statements (SDS), audit trails for determinations, and integration with payroll for inside-IR35 deductions. Getting this wrong can result in HMRC tax assessments going back 6 years."
    },
    {
      "regulation": "Agency Workers Regulations (AWR) 2010",
      "description": "UK law requiring that agency workers receive equal treatment on pay and conditions after 12 weeks in the same role",
      "when_buyer_raises_it": "When discussing contractor management for long-term engagements, especially in public sector. AWR triggers require proactive tracking — missing the 12-week threshold is a common compliance failure.",
      "rep_should_know": "The system needs to track the 12-week qualifying period per assignment, alert when AWR rights trigger, and support pay parity calculations. Agencies are liable for ensuring compliance, not the end client."
    },
    {
      "regulation": "Conduct of Employment Agencies and Employment Businesses Regulations 2003",
      "description": "Core UK regulations governing recruitment agency conduct, including requirements for terms of business, candidate consent, and record keeping",
      "when_buyer_raises_it": "When discussing terms of business automation, candidate opt-in workflows, or record retention policies. The EAS (Employment Agency Standards Inspectorate) can inspect without notice.",
      "rep_should_know": "Agencies must hold written terms with workers and hirers, maintain records for specific periods, and not charge candidates for work-finding services. The tool should support compliant terms management and audit-ready record keeping."
    },
    {
      "regulation": "GDPR and Candidate Data Consent",
      "description": "Recruitment agencies hold large volumes of personal data and must have lawful basis for processing, typically legitimate interest with clear consent for marketing",
      "when_buyer_raises_it": "When discussing candidate databases, data migration, or marketing automation. Agencies are regularly targeted by ICO for non-compliant candidate data handling.",
      "rep_should_know": "The system must support consent management, data retention policies with automated purging, subject access request workflows, and the right to erasure. Candidate data older than 2 years without re-consent is a liability, not an asset."
    }
  ]'::jsonb,

  -- call_stage_behaviours
  '{
    "cold_call": {
      "buyer_mood": "Sceptical but not hostile — recruitment leaders get cold-called constantly and have heard every pitch",
      "patience_level": 2,
      "time_to_hang_up": "25-35 seconds",
      "what_earns_more_time": "Mentioning a competitor agency that uses the product, referencing a specific PSL they lost or won, showing you understand the difference between contract and perm economics, citing NFI impact not feature lists"
    },
    "discovery": {
      "openness": "Moderate to high — recruitment leaders are generally open about operational challenges because the industry is collegial",
      "information_sharing_willingness": "Will share process details and pain points readily. Will not share specific client names, rate cards, or billings numbers without trust being established.",
      "test_questions_buyer_asks": [
        "What percentage of your customers are agencies vs in-house?",
        "Do you integrate with Bullhorn, Vincere, or Mercury?",
        "How do you handle the difference between contract temp and contract perm?",
        "Can your system track AWR 12-week triggers automatically?"
      ]
    },
    "evaluation": {
      "stakeholders_involved": ["MD or Agency Owner (budget holder)", "Head of Delivery (operational decision)", "Top-billing consultant (adoption litmus test)", "Compliance Manager or FD (compliance and commercial)"],
      "proof_points_demanded": ["Case study from a similar-sized agency", "Live demonstration using a real role brief", "Adoption metrics — DAU not just licence count", "ROI model in NFI terms not time-saved terms"],
      "competitive_mentions": ["Bullhorn", "Vincere", "Mercury xRM", "JobAdder", "Hireserve", "iCIMS"]
    },
    "negotiation": {
      "procurement_involvement": "Rare in agencies under 100 people — the MD decides. Enterprise staffing firms have formal procurement.",
      "discount_expectations": "20-30% off list, especially if headcount is over 50 consultants. Multi-year discounts expected.",
      "timeline_pressure": "Often tied to Bullhorn or other ATS contract renewal date. If they have 3 months left on their current contract, thats the window.",
      "decision_blockers": ["Consultant buy-in from the pilot group", "Data migration plan and timeline", "Integration confirmation with their specific job board and VMS stack", "FD sign-off on total cost including migration"]
    }
  }'::jsonb,

  -- pricing_sensitivity_profile
  '{
    "budget_holder_title": "Managing Director or agency owner, FD for larger firms",
    "typical_budget_range": "£8K-£40K ACV depending on consultant count and modules",
    "procurement_process_length_days": 21,
    "discount_tolerance_pct": 25,
    "red_flag_phrases": [
      "Our platform is used by thousands of recruitment firms",
      "You wont need Bullhorn anymore",
      "Implementation is seamless",
      "AI will find candidates for your consultants",
      "Per-user pricing regardless of usage"
    ]
  }'::jsonb,

  -- buying_committee_structure
  '[
    {
      "role": "Commercial Decision Maker",
      "title_examples": ["Managing Director", "Agency Owner", "CEO"],
      "influence_level": "decision_maker",
      "enters_at_stage": "discovery",
      "typical_concerns": ["NFI impact", "Total cost vs total return", "Competitive advantage in PSL tenders", "Consultant retention — will good people leave if the tools are bad?"],
      "how_to_win_them": "Talk in billings and margin, not features. Show how a competitor agency grew NFI per head after adopting your platform. Make the commercial case irresistible."
    },
    {
      "role": "Operational Champion",
      "title_examples": ["Head of Delivery", "Operations Director", "Head of Recruitment"],
      "influence_level": "champion",
      "enters_at_stage": "discovery",
      "typical_concerns": ["Process improvement", "Consultant productivity", "Reporting accuracy", "Reducing manual candidate admin"],
      "how_to_win_them": "Show the day-in-the-life improvement. Walk through a real workflow: role brief comes in, source candidates, submit to client, track interviews, make placement. If you can save 30 minutes per role, they will champion you."
    },
    {
      "role": "End User Validator",
      "title_examples": ["Senior Consultant", "Top Biller", "Team Lead"],
      "influence_level": "blocker",
      "enters_at_stage": "evaluation",
      "typical_concerns": ["Speed — will this slow me down?", "Usability — is it intuitive or do I need training?", "Mobile access — I work from client sites", "Does it actually help me find better candidates faster?"],
      "how_to_win_them": "Let them use it on a real live role, unsupervised. If they come back and say it was faster than their current process, you have won. If they say it added steps, you have lost — regardless of what the MD thinks."
    },
    {
      "role": "Finance and Compliance Gatekeeper",
      "title_examples": ["Finance Director", "Head of Compliance", "Commercial Director"],
      "influence_level": "blocker",
      "enters_at_stage": "negotiation",
      "typical_concerns": ["Total cost of ownership including migration", "IR35 compliance capability", "AWR tracking", "GDPR candidate data handling", "Contract flexibility for headcount changes"],
      "how_to_win_them": "Pre-empt compliance questions. Show IR35 workflow, AWR tracking, GDPR consent management without being asked. Have flexible pricing that scales down as well as up — agencies shed headcount in downturns and need contracts that accommodate that."
    }
  ]'::jsonb
);
