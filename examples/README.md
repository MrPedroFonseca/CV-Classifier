# Fictional Evaluation Dataset

`evaluation-cases.json` contains six fully fictional job advertisements and candidate profiles. It includes clear matches, preference conflicts, missing information, and unrelated text. No real employer advertisements, personal resumes, or contact details are included.

## Run an evaluation

1. Start the backend and frontend using the setup instructions in the repository README.
2. Select an available provider and model in the app.
3. For each case, paste its `resume` and `advertisement` into the app and enter the listed `preferences`.
4. Compare the result with that case's `checks`. Treat each check as a semantic expectation, not an exact wording requirement.
5. Record correctness, compatibility score, response time, and token usage for each case and model. Do not change the prompt between providers during a comparison.
6. Review incorrect or inconsistent results before adjusting the prompt. Keep the original result record so future comparisons use the same baseline.

The checks deliberately focus on observable facts and supported conclusions. In particular, verify that missing details remain unknown, office-day limits are applied only when both sides provide the needed information, and unrelated text does not lead to invented job requirements.

No live model evaluations are included in this repository yet. Running the cases against a provider sends the case text to that provider, so review its data handling terms first.
