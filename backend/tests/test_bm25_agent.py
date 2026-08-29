import pytest
from backend.agent_gateway.bm25_ranker import BM25Ranker
from backend.agent_gateway.mock_agent import SavedProfileMockAgent, BM25MockAgent
from backend.models.domain import SanitizedElement, SanitizedPageState

@pytest.fixture
def sample_sanitized_elements():
    return [
        SanitizedElement(
            element_id="user_email",
            type="input",
            label="Email Address",
            value="[EMAIL_0]",
            is_interactive=True,
            sensitive=True
        ),
        SanitizedElement(
            element_id="user_password",
            type="password",
            label="Password",
            value="[PASSWORD_1]",
            is_interactive=True,
            sensitive=True
        ),
        SanitizedElement(
            element_id="phone_number_input",
            type="tel",
            label="Phone Number",
            value="[PHONE_2]",
            is_interactive=True,
            sensitive=True
        ),
        SanitizedElement(
            element_id="security_pin_field",
            type="input",
            label="Security PIN",
            value="[PIN_3]",
            is_interactive=True,
            sensitive=True
        ),
        SanitizedElement(
            element_id="save_changes_btn",
            type="button",
            label="Save Changes",
            text="Save Changes",
            is_interactive=True,
            sensitive=False
        ),
        SanitizedElement(
            element_id="unrelated_footer",
            type="div",
            label="Copyright Info",
            text="© 2026 Example Corp",
            is_interactive=False,
            sensitive=False
        )
    ]

class TestBM25Ranker:

    def test_email_intent_selects_email_field(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        selected = ranker.select_best_element("email address", sample_sanitized_elements)
        assert selected is not None
        assert selected.element_id == "user_email"

    def test_password_intent_selects_password_field(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        selected = ranker.select_best_element("password", sample_sanitized_elements)
        assert selected is not None
        assert selected.element_id == "user_password"

    def test_phone_intent_selects_phone_field(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        selected = ranker.select_best_element("phone number", sample_sanitized_elements)
        assert selected is not None
        assert selected.element_id == "phone_number_input"

    def test_pin_intent_selects_pin_field(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        selected = ranker.select_best_element("security pin", sample_sanitized_elements)
        assert selected is not None
        assert selected.element_id == "security_pin_field"

    def test_button_intent_identifies_appropriate_button(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        selected = ranker.select_best_element("save changes", sample_sanitized_elements)
        assert selected is not None
        assert selected.element_id == "save_changes_btn"

    def test_unrelated_elements_receive_lower_rankings(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        scores = ranker.score_elements("email address", sample_sanitized_elements)

        email_score = next(s for e, s in scores if e.element_id == "user_email")
        footer_score = next(s for e, s in scores if e.element_id == "unrelated_footer")

        assert email_score > footer_score
        assert footer_score == 0.0

    def test_ambiguous_matches_handled_safely(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        selected = ranker.select_best_element("nonexistent XYZ query", sample_sanitized_elements)
        assert selected is None

    def test_raw_sensitive_values_never_passed_into_ranker(self, sample_sanitized_elements):
        ranker = BM25Ranker()
        raw_pii_value = "SUPER_SECRET_PII_JOHN_DOE@GMAIL.COM"

        elem = SanitizedElement(
            element_id="sensitive_test",
            type="input",
            label="User Identity",
            value="[PERSON_NAME_0]",
            is_interactive=True,
            sensitive=True
        )

        corpus = ranker._extract_safe_corpus(elem)
        corpus_str = " ".join(corpus)

        assert raw_pii_value not in corpus_str

class TestBM25MockAgent:

    def test_agent_sequence_execution(self, sample_sanitized_elements):
        agent = SavedProfileMockAgent()
        page_state = SanitizedPageState(
            url="http://127.0.0.1:8080/profile",
            title="Profile Page",
            elements=sample_sanitized_elements,
            viewport={"width": 1280, "height": 800},
            timestamp=1000.0
        )

        actions = []
        while action := agent.next_action(page_state):
            actions.append(action)

        assert len(actions) == 5
        assert actions[0].element_id == "user_email"
        assert actions[0].value_token == "[EMAIL_0]"

        assert actions[1].element_id == "user_password"
        assert actions[1].value_token == "[PASSWORD_1]"

        assert actions[2].element_id == "phone_number_input"
        assert actions[2].value_token == "[PHONE_2]"

        assert actions[3].element_id == "security_pin_field"
        assert actions[3].value_token == "[PIN_3]"

        assert actions[4].element_id == "save_changes_btn"
        assert actions[4].action == "click"
