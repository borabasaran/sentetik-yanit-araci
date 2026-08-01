import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const start = html.indexOf("<script>") + "<script>".length;
const end = html.indexOf("</script>", start);
const source = html.slice(start, end);

function runtime(overrides = {}) {
  const elements = {
    anon: { value: "ANON-1" }, profile: { value: "Mühendislik öğrencisi" },
    a10: { value: "Teknolojiyi ölçülü kullanırım." },
  };
  const context = {
    location: { search: "" }, URLSearchParams, URL, AbortController, DOMException,
    setTimeout, clearTimeout, console,
    document: { getElementById: id => elements[id] ?? { value: "" } },
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(source + ";globalThis.hooks={normalizeFormUrl,whichProvider,parseForm,buildPrompt,extractJSON,bestOption,validateAnswers,resetFormState,callOnce,cancelCurrent,submitForm,S,RUN};", context);
  return { ...context.hooks, context, elements };
}

test("normalizes supported Google Forms URLs", () => {
  const { normalizeFormUrl } = runtime();
  assert.equal(normalizeFormUrl("forms.gle/example"), "https://forms.gle/example");
  assert.equal(normalizeFormUrl("https://docs.google.com/forms/d/e/ID/formResponse?x=1"), "https://docs.google.com/forms/d/e/ID/viewform");
  assert.equal(normalizeFormUrl("https://example.com/form"), null);
});

test("detects supported API key families", () => {
  const { whichProvider } = runtime();
  assert.equal(whichProvider("AIza1234567890123456789012345"), "gemini");
  assert.equal(whichProvider("sk-ant-example"), "anthropic");
  assert.equal(whichProvider("sk-example"), "openai");
});

test("parses text, choice and grid rows from form payload", () => {
  const { parseForm } = runtime();
  const data = [];
  data[1] = [];
  data[1][1] = [
    [null, "Anonim kod", null, 0, [[101, [], 1]]],
    [null, "Seçimin", null, 2, [[102, [["A"], ["B"]], 1]]],
    [null, "Tablo", null, 7, [[103, [["1"], ["2"]], 1, ["Satır 1"]]]],
  ];
  data[3] = "Test formu";
  const parsed = parseForm(`<script>FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(data)};</script>`);
  assert.equal(parsed.title, "Test formu");
  assert.equal(parsed.questions.length, 3);
  assert.equal(parsed.questions[0].autofill, "anon");
  assert.deepEqual(Array.from(parsed.questions[1].options), ["A", "B"]);
  assert.match(parsed.questions[2].title, /Satır 1/);
});

test("builds a profile and A10 grounded prompt without anonymous code", () => {
  const { buildPrompt, S } = runtime();
  S.questions = [{ entryId: "1", title: "Görüşün?", type: 1, options: [], required: true }];
  const prompt = buildPrompt();
  assert.match(prompt, /Mühendislik öğrencisi/);
  assert.match(prompt, /Teknolojiyi ölçülü kullanırım/);
  assert.doesNotMatch(prompt, /ANON-1/);
});

test("validates required answers and avoids ambiguous fuzzy options", () => {
  const { validateAnswers, bestOption, S } = runtime();
  S.questions = [
    { entryId: "1", title: "Zorunlu", type: 1, options: [], required: true },
    { entryId: "2", title: "Seçim", type: 2, options: ["Evet bazen", "Evet sık"], required: true },
  ];
  const result = validateAnswers({ answers: { 1: "Yanıt", 2: "Evet" } });
  assert.deepEqual(Array.from(result.missing), ["Seçim"]);
  assert.equal(bestOption("Evet", ["Evet bazen", "Evet sık"]), null);
});

test("resets generation logs when the form changes", () => {
  const { resetFormState, S } = runtime();
  S.answers = { 1: "x" }; S.attempts = 2; S.log = [{ raw: "old" }];
  resetFormState();
  assert.equal(S.answers, null);
  assert.equal(S.attempts, 0);
  assert.equal(S.log.length, 0);
});

test("passes caller abort signal to provider requests", async () => {
  let observedSignal;
  const fetch = async (_url, options) => {
    observedSignal = options.signal;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }) };
  };
  const { callOnce } = runtime({ fetch });
  const controller = new AbortController();
  await callOnce("gemini", "model", "prompt", "key", controller.signal);
  assert.equal(observedSignal, controller.signal);
});

test("cancels the active operation", () => {
  const { cancelCurrent, RUN } = runtime();
  RUN.controller = new AbortController();
  cancelCurrent();
  assert.equal(RUN.cancelled, true);
  assert.equal(RUN.controller.signal.aborted, true);
});

test("uses an honest unverified delivery state", () => {
  assert.match(html, /İletim denendi/);
  assert.match(html, /kesin teslim doğrulanamadı/);
  assert.doesNotMatch(html, /Gönderildi, teşekkürler/);
});

test("transitions to the unverified delivery state only after form submit is invoked", () => {
  let submitted = 0;
  const elements = {
    ebox: { hidden: true, textContent: "", scrollIntoView() {} },
    btnSend: { disabled: false, innerHTML: "", textContent: "" },
    mainCard: { hidden: false }, doneCard: { hidden: true },
    anon: { value: "ANON-1" }, profile: { value: "Profil" }, a10: { value: "A10" },
  };
  const document = {
    getElementById: id => elements[id],
    createElement: tag => tag === "form" ? {
      method: "", action: "", target: "", style: {}, acceptCharset: "", appendChild() {},
      submit() { submitted++; }, remove() {},
    } : { type: "", name: "", value: "" },
    body: { appendChild() {} },
  };
  const { submitForm, S } = runtime({ document, window: { scrollTo() {} }, setTimeout: fn => { fn(); return 1; } });
  S.formId = "FORM";
  S.questions = [{ entryId: "1", title: "Soru", type: 1, options: [], required: true }];
  S.answers = { 1: "Yanıt" };
  submitForm();
  assert.equal(submitted, 1);
  assert.equal(elements.mainCard.hidden, true);
  assert.equal(elements.doneCard.hidden, false);
});
