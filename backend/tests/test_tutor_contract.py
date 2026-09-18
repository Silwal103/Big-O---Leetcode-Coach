import unittest

from chains.prompts import MODE_INSTRUCTIONS
from chains.tutor import create_tutor_chain
from models.schemas import TutorRequest, TutorResponse


class TutorContractTests(unittest.TestCase):
    def test_prompt_inputs_match_context_contract(self):
        expected = {
            "user_message",
            "problem_title",
            "problem_description",
            "constraints",
            "examples",
            "code",
            "language",
            "mode",
            "mode_instructions",
            "hint_level",
            "history",
        }
        self.assertEqual(set(create_tutor_chain().input_schema.model_fields), expected)

    def test_all_tutor_modes_have_instructions(self):
        modes = {
            "chat",
            "hint",
            "stronger_hint",
            "explain_concept",
            "review_approach",
            "show_solution",
        }
        self.assertTrue(modes.issubset(MODE_INSTRUCTIONS))

    def test_request_accepts_full_problem_context(self):
        request = TutorRequest(
            message="Review my approach",
            problem_title="Two Sum",
            problem_description="Find two values that add to a target.",
            constraints="2 <= nums.length",
            examples="nums = [2, 7], target = 9",
            code="return []",
            language="python",
            mode="review_approach",
            hint_level=2,
            history=[{"role": "user", "content": "Give me a hint."}],
        )
        self.assertEqual(request.language, "python")
        self.assertEqual(request.hint_level, 2)
        self.assertEqual(request.history[0]["role"], "user")

    def test_response_metadata_defaults_are_safe(self):
        response = TutorResponse(response="Think about what you have already seen.")
        self.assertEqual(response.hint_level, 0)
        self.assertFalse(response.reveals_solution)
        self.assertEqual(response.issues, [])


if __name__ == "__main__":
    unittest.main()
