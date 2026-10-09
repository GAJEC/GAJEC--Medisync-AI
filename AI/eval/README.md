# Local evaluation scaffolding

All included vignettes are synthetic placeholders, not clinical cases or
medical advice. Their expected urgency labels are illustrative only. Filipino
wording, translations, case coverage, and every target label require review
and approval by qualified Filipino and English clinicians before results can
inform any product decision. The ambiguous example uses an explicitly
conservative urgent target for measurement; it is not a validated clinical
recommendation.

The scripts call only a loopback AI service and do not contact hosted APIs.
Run them against a local service with test or otherwise approved, de-identified
data. Outputs contain aggregate metrics only; scripts do not print model
responses, transcripts, or references.

## Triage urgency evaluation

Start the local AI service with local weights, then from `AI/` run:

```powershell
$env:AI_INTERNAL_TOKEN = "<local service token>"
python -m eval.evaluate_triage
```

The headline metric is under-triage rate: the share of vignettes whose
predicted urgency is lower than the target, including an undetermined output.
The script also prints exact-match accuracy for each target urgency level and
overall. Review each error with clinicians; these tiny placeholder examples
do not measure real-world safety, sensitivity, specificity, or language
performance.

## Speech word error rate

Provide an approved local manifest at `eval/speech-manifest.tsv` with a header
and two tab-separated columns, `file` and `reference`. Files must be under
`eval/recordings/`. Recordings and references are deliberately not included.
Then run:

```powershell
$env:AI_INTERNAL_TOKEN = "<local service token>"
python -m eval.evaluate_speech
```

The script reports aggregate word error rate (WER) only. Obtain appropriate
consent and remove identifying information before using any recordings.
WER is calculated as substitutions + deletions + insertions divided by the
number of reference words; an empty reference is rejected.
