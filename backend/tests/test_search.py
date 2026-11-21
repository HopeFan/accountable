def find(client, q):
    r = client.get("/api/search", params={"q": q})
    assert r.status_code == 200, r.text
    return r.json()


def names(hits):
    return [h["name"] for h in hits]


def test_finds_each_kind_in_any_case(client, make):
    org = make.org("Globex Corp")
    make.contact(org["id"], "Hank", "Scorpio")
    make.deal(org["id"], "Globex renewal")
    for q in ("GLOBEX", "globex", "GlObEx"):
        out = find(client, q)
        assert names(out["organizations"]) == ["Globex Corp"]
        assert names(out["deals"]) == ["Globex renewal"]
    assert names(find(client, "SCORP")["contacts"]) == ["Hank Scorpio"]
    assert find(client, "hank")["contacts"][0]["name"] == "Hank Scorpio"


def test_matches_anywhere_in_name(client, make):
    make.org("Initech")
    assert names(find(client, "tec")["organizations"]) == ["Initech"]


def test_contact_found_by_full_name(client, make):
    c = make.contact(None, "Ada", "Lovelace")
    make.contact(None, "Bob", "Lovelace")
    out = find(client, "ada lov")
    assert [h["id"] for h in out["contacts"]] == [c["id"]]
    assert out["contacts"][0]["name"] == "Ada Lovelace"


def test_percent_and_underscore_are_literal(client, make):
    make.org("50% Off")
    make.org("Fifty Off")
    make.org("a_b")
    make.org("axb")
    assert names(find(client, "%")["organizations"]) == ["50% Off"]
    assert names(find(client, "a_b")["organizations"]) == ["a_b"]
    assert names(find(client, "_")["organizations"]) == ["a_b"]


def test_backslash_is_literal(client, make):
    make.org("A\\B")
    make.org("AB")
    assert names(find(client, "a\\b")["organizations"]) == ["A\\B"]


def test_blank_query_returns_nothing(client, make):
    make.org("Acme")
    empty = {"organizations": [], "contacts": [], "deals": []}
    assert find(client, "") == empty
    assert find(client, "   ") == empty
    assert client.get("/api/search").json() == empty


def test_at_most_five_ordered_by_name(client, make):
    for n in ("Org g", "Org b", "Org e", "Org a", "Org f", "Org d", "Org c"):
        make.org(n)
    out = find(client, "org")
    assert names(out["organizations"]) == [f"Org {c}" for c in "abcde"]


def test_context_lines(client, make):
    org = make.org("Acme")
    client.patch(f"/api/organizations/{org['id']}", json={"industry": "Software"})
    make.contact(org["id"], "Ada", "Lovelace")
    make.contact(None, "Ada", "Nobody")
    make.deal(org["id"], "Big deal", stage="proposal")
    out = find(client, "acme")
    assert out["organizations"][0]["context"] == "Software"
    assert find(client, "ada lovelace")["contacts"][0]["context"] == "Acme"
    assert find(client, "nobody")["contacts"][0]["context"] == ""
    assert find(client, "big")["deals"][0]["context"] == "Acme · Proposal"
    make.org("Plain")
    assert find(client, "plain")["organizations"][0]["context"] == ""


def test_finds_sample_records(seeded):
    out = seeded.get("/api/search", params={"q": "a"}).json()
    assert out["organizations"] and out["contacts"] and out["deals"]
    for hits in out.values():
        assert len(hits) <= 5


def test_finds_sample_and_authored_records(client, make, db_file):
    from sqlalchemy import update

    from app.db import get_engine, organization

    make.org("Authored Co")
    sample = make.org("Sample Co")
    with get_engine().begin() as conn:
        conn.execute(
            update(organization)
            .where(organization.c.id == sample["id"])
            .values(created_by=None, updated_by=None)
        )
    assert names(find(client, "co")["organizations"]) == ["Authored Co", "Sample Co"]


def test_accented_name_found_in_any_case(client, make):
    make.org("Éclair Société")
    make.contact(None, "Zoë", "Müller")
    for q in ("éclair", "ÉCLAIR", "société", "SOCIÉTÉ"):
        assert names(find(client, q)["organizations"]) == ["Éclair Société"]
    assert names(find(client, "MÜLLER")["contacts"]) == ["Zoë Müller"]
    assert names(find(client, "zoë mü")["contacts"]) == ["Zoë Müller"]


def test_requires_sign_in(signed_out):
    assert signed_out.get("/api/search", params={"q": "a"}).status_code == 401
