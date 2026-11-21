"""Fixed sample data, dated relative to today, and the reset logic."""
from datetime import datetime, time, timedelta

from sqlalchemy import insert

from . import clock, db, rules

ORGS = [
    ("Northwind Logistics", "northwind-logistics.example", "Logistics", "Regional freight carrier with 140 trucks. Renews its software contracts each spring."),
    ("Harbor Health Partners", "harborhealth.example", "Healthcare", "Group of six hospitals. Decisions go through the IT steering committee."),
    ("Brightpath Software", "brightpath.example", "Software", "Mid-sized SaaS company and a long-standing customer."),
    ("Cobalt Manufacturing", "cobalt-mfg.example", "Manufacturing", "Makes industrial pumps. Two plants, one in the north and one abroad."),
    ("Meridian Financial Group", "meridianfg.example", "Finance", "Regional lender. Compliance reviews every purchase over USD 25,000."),
    ("Fernhill Retail", "fernhill.example", "Retail", "Chain of 38 home and garden stores. Peak season starts in September."),
    ("Lakeside University", "lakeside.example", "Education", "Public university. Budgets are set in March."),
    ("Solstice Energy", "solstice-energy.example", "Energy", "Solar and storage developer growing quickly."),
    ("Atlas Freight Systems", "atlasfreight.example", "Logistics", "Cross-border freight forwarder."),
    ("Pinecrest Clinics", "pinecrest.example", "Healthcare", "Network of family clinics."),
    ("Quartz Analytics", "quartz-analytics.example", "Software", "Data consultancy that resells our work to its clients."),
    ("Ironbridge Fabrication", "ironbridge.example", "Manufacturing", "Custom steel fabrication shop with a new second site."),
]

# first, last, job title, status
CONTACTS = [
    [("Priya", "Nair", "COO", "customer"), ("Tom", "Becker", "Head of Procurement", "qualified"), ("Sara", "Lindqvist", "Fleet Manager", "lead")],
    [("Hannah", "Brooks", "CIO", "qualified"), ("Marcus", "Reyes", "Operations Director", "customer"), ("Elena", "Petrova", "IT Manager", "lead")],
    [("Jonas", "Weber", "CEO", "customer"), ("Amira", "Haddad", "VP Sales", "qualified"), ("Liam", "O'Connor", "Product Lead", "lead")],
    [("Grace", "Tanaka", "Plant Director", "lead"), ("Diego", "Alvarez", "Procurement Manager", "lead"), ("Fiona", "Walsh", "Finance Director", "customer")],
    [("Omar", "Siddiqui", "CFO", "qualified"), ("Rachel", "Kim", "Head of Risk", "customer"), ("Ben", "Archer", "Analyst", "lead")],
    [("Chloe", "Martin", "Head of Ecommerce", "lead"), ("Nikhil", "Rao", "COO", "qualified"), ("Tessa", "Moore", "Store Operations", "customer")],
    [("Helen", "Fischer", "Registrar", "customer"), ("Yusuf", "Demir", "IT Director", "lead"), ("Anna", "Kowalski", "Finance Officer", "qualified")],
    [("Victor", "Almeida", "Head of Operations", "customer"), ("Mei", "Chen", "Sustainability Lead", "lead"), ("Paul", "Gordon", "Procurement Lead", "qualified")],
    [("Isabel", "Costa", "Managing Director", "customer"), ("Declan", "Murphy", "Logistics Planner", "lead"), ("Noor", "Rahman", "Finance Manager", "customer")],
    [("Carla", "Mendes", "Practice Director", "qualified"), ("Sam", "Whitaker", "Office Manager", "customer"), ("Zoe", "Hartley", "IT Coordinator", "lead")],
    [("Rohan", "Mehta", "Founder", "customer"), ("Katarina", "Novak", "Head of Data", "lead"), ("Elliot", "Grant", "Operations Lead", "qualified")],
    [("Lars", "Eriksson", "Managing Director", "lead"), ("Maya", "Singh", "Operations Manager", "customer")],
]

# name, organization number (1-based), value
WON = [
    ("Route planning licence", 1, 62000), ("Patient portal rollout", 2, 48000), ("Annual support plan", 3, 24000),
    ("Line monitoring sensors", 4, 85000), ("Risk reporting dashboard", 5, 36000), ("Loyalty app build", 6, 54000),
    ("Student records migration", 7, 72000), ("Grid usage analytics", 8, 41000), ("Warehouse scanning upgrade", 9, 28000),
    ("Clinic scheduling system", 10, 19000), ("Data pipeline setup", 11, 33000), ("Maintenance tracking", 12, 15000),
]
LOST = [
    ("Fleet telematics pilot", 1, 22000), ("Records archive project", 2, 17000), ("Payment gateway rebuild", 5, 58000),
    ("Inventory forecasting", 6, 31000), ("Campus wifi analytics", 7, 9000),
]
OPEN = {
    "new": [("Driver app refresh", 1, 18000), ("Telehealth integration", 2, 35000), ("Sales forecasting add-on", 3, 12000),
            ("Supplier portal", 4, 26000), ("Compliance audit tooling", 5, 44000), ("Pop-up store system", 6, 8000)],
    "qualified": [("Library platform upgrade", 7, 38000), ("Solar monitoring suite", 8, 67000), ("Customs documents tool", 9, 29000),
                  ("Appointment reminders", 10, 11000), ("Customer health scoring", 11, 21000), ("Quality inspection vision", 12, 52000)],
    "proposal": [("Dispatch optimisation", 1, 76000), ("Billing automation", 2, 33000), ("Onboarding workflow", 3, 15000),
                 ("Predictive maintenance", 4, 98000), ("Fraud alerts", 5, 61000), ("Returns portal", 6, 23000)],
    "negotiation": [("Exam scheduling", 7, 45000), ("Battery storage dashboard", 8, 82000), ("Dock booking system", 9, 37000),
                    ("Multi-site reporting", 10, 27000), ("Usage billing engine", 11, 55000)],
}
LATE = {"Telehealth integration": 5, "Customs documents tool": 12, "Returns portal": 20, "Exam scheduling": 9}
HAND_PROBABILITY = {"Dispatch optimisation": 55, "Battery storage dashboard": 85, "Compliance audit tooling": 15}
WON_DAYS_AGO = [0, 5, 35, 62, 68, 74, 80, 120, 150, 185, 240, 310]
LOST_DAYS_AGO = [20, 45, 70, 110, 160]
PREVIOUS = {"qualified": "new", "proposal": "qualified", "negotiation": "proposal", "won": "negotiation"}
LOST_FROM = ["proposal", "qualified", "proposal", "qualified", "new"]

NOTES = [
    "Spoke with the team about timing and budget. They want to decide this quarter.",
    "Sent the pricing overview and a short case study.",
    "Walked through the demo. Questions about reporting and user roles.",
    "Their finance team needs a written quote before the next review.",
    "Agreed the scope for a first phase. Waiting for sign-off.",
    "Introduced us to their operations lead, who will test the workflow.",
]
CALLS = [
    "Intro call. Good fit, and they have budget set aside.",
    "Checked in on the proposal. No objections so far.",
    "Discussed rollout dates and who needs training.",
    "Pricing call. They asked for a discount on a two-year term.",
]
EMAILS = [
    "Sent the revised proposal with the updated rollout plan.",
    "Shared the security questionnaire answers.",
    "Followed up on the demo with the recording and a summary.",
    "Sent the contract draft for legal review.",
]
FOLLOW_UPS = [
    "Send the revised quote", "Call to check on the decision", "Share the reference customer details",
    "Book a demo for the wider team", "Chase the signed contract", "Confirm the start date",
    "Send the implementation timeline", "Ask about budget approval", "Check in after the pilot",
    "Prepare the renewal offer", "Follow up on the security review", "Confirm training dates",
    "Send the case study", "Check the legal review", "Ask who signs the order",
]
OVERDUE_OFFSETS = [-9, -5, -2]
UPCOMING_OFFSETS = [1, 2, 3, 5, 7, 9, 11, 13]
DONE_OFFSETS = [-14, -10, -6, -3]


def at(day, hour: int = 10) -> datetime:
    return datetime.combine(day, time(hour, 0))


def seed_all(conn) -> None:
    today = clock.today()

    org_ids = []
    for name, site, industry, notes in ORGS:
        r = conn.execute(insert(db.organization).values(name=name, website=site, industry=industry, notes=notes))
        org_ids.append(r.inserted_primary_key[0])

    contact_ids: list[list[int]] = []
    for oi, people in enumerate(CONTACTS):
        ids = []
        for first, last, title, status in people:
            email = f"{first}.{last}".lower().replace("'", "") + "@" + ORGS[oi][1]
            phone = f"+1 555 {100 + len(contact_ids) * 7 + len(ids):03d} {1000 + oi * 37 + len(ids) * 11:04d}"
            r = conn.execute(
                insert(db.contact).values(
                    first_name=first, last_name=last, job_title=title, status=status,
                    email=email, phone=phone, organization_id=org_ids[oi],
                )
            )
            ids.append(r.inserted_primary_key[0])
        contact_ids.append(ids)

    deal_rows: list[dict] = []  # for activities

    def add_deal(name, org_no, value, stage, close_date, position, i) -> int:
        oi = org_no - 1
        people = contact_ids[oi]
        contact_id = None if i % 7 == 6 else people[i % len(people)]
        probability = HAND_PROBABILITY.get(name, rules.usual_probability(stage))
        r = conn.execute(
            insert(db.deal).values(
                name=name, organization_id=org_ids[oi], contact_id=contact_id, stage=stage,
                value=value, probability=probability, close_date=close_date, position=position,
            )
        )
        deal_id = r.inserted_primary_key[0]
        deal_rows.append({"id": deal_id, "contact_id": contact_id, "stage": stage, "org": oi})
        return deal_id

    def stage_change(deal_id, old, new, when):
        conn.execute(
            insert(db.activity).values(
                type="stage_change", deal_id=deal_id, occurred_at=when,
                description=f"Moved from {rules.STAGE_LABELS[old]} to {rules.STAGE_LABELS[new]}",
            )
        )

    i = 0
    for n, (name, org_no, value) in enumerate(WON):
        ago = WON_DAYS_AGO[n]
        if n == 1:
            ago = min(5, today.day - 1)
        close = today - timedelta(days=ago)
        d = add_deal(name, org_no, value, "won", close, n, i)
        stage_change(d, "negotiation", "won", at(close))
        i += 1
    for n, (name, org_no, value) in enumerate(LOST):
        close = today - timedelta(days=LOST_DAYS_AGO[n])
        d = add_deal(name, org_no, value, "lost", close, n, i)
        stage_change(d, LOST_FROM[n], "lost", at(close))
        i += 1
    for stage in rules.OPEN_STAGES:
        for n, (name, org_no, value) in enumerate(OPEN[stage]):
            if name in LATE:
                close = today - timedelta(days=LATE[name])
            else:
                close = today + timedelta(days=10 + (i * 13) % 110)
            d = add_deal(name, org_no, value, stage, close, n, i)
            if stage != "new":
                stage_change(d, PREVIOUS[stage], stage, at(today - timedelta(days=3 + (i * 5) % 25)))
            i += 1

    # notes, calls and emails over the past 90 days
    open_deals = [d for d in deal_rows if rules.is_open(d["stage"])]
    kinds = ["call", "email", "note"]
    texts = {"call": CALLS, "email": EMAILS, "note": NOTES}
    follow_dates = (
        [today + timedelta(days=o) for o in OVERDUE_OFFSETS]
        + [today + timedelta(days=o) for o in UPCOMING_OFFSETS]
    )
    done_dates = [today + timedelta(days=o) for o in DONE_OFFSETS]
    for k in range(50):
        kind = kinds[k % 3]
        text = texts[kind][(k // 3) % len(texts[kind])]
        if k < 15:
            target = open_deals[(k * 3) % len(open_deals)]
        elif k < 38:
            target = deal_rows[(k * 5) % len(deal_rows)]
        else:
            target = None
        values: dict = {
            "type": kind,
            "occurred_at": at(today - timedelta(days=(k * 7 + 3) % 88 + 1), 9 + k % 8),
            "description": text,
        }
        if target:
            values["deal_id"] = target["id"]
        else:
            org = (k * 5) % len(CONTACTS)
            values["contact_id"] = contact_ids[org][k % len(contact_ids[org])]
        if k < 11:
            values["follow_up_date"] = follow_dates[k]
            values["description"] = f"{text} Next: {FOLLOW_UPS[k].lower()}."
        elif k < 15:
            values["follow_up_date"] = done_dates[k - 11]
            values["follow_up_done"] = True
            values["description"] = f"{text} Next: {FOLLOW_UPS[k].lower()}."
        conn.execute(insert(db.activity).values(**values))


def reset() -> None:
    db.drop_tables()
    db.create_tables()
    with db.get_engine().begin() as conn:
        seed_all(conn)


def ensure_seeded() -> None:
    if not db.db_path().exists():
        reset()
    else:
        db.create_tables()
