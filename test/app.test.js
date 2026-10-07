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
  vm.runInContext(source + ";globalThis.hooks={normalizeFormUrl,looksLikeGeminiKey,parseForm,checkFormReady,buildPrompt,extractJSON,bestOption,validateAnswers,resetFormState,callLLM,llmError,buildSubmission,cancelCurrent,submitForm,S,RUN,MODEL,TOOL_VERSION,FORM_PROXY};", context);
  return { ...context.hooks, context, elements };
}

test("normalizes supported Google Forms URLs", () => {
  const { normalizeFormUrl } = runtime();
  assert.equal(normalizeFormUrl("forms.gle/example"), "https://forms.gle/example");
  assert.equal(normalizeFormUrl("https://docs.google.com/forms/d/e/ID/formResponse?x=1"), "https://docs.google.com/forms/d/e/ID/viewform");
  assert.equal(normalizeFormUrl("https://example.com/form"), null);
});

test("accepts only Gemini-shaped keys", () => {
  const { looksLikeGeminiKey } = runtime();
  assert.equal(looksLikeGeminiKey("AIza1234567890123456789012345"), true);
  assert.equal(looksLikeGeminiKey("sk-ant-example"), false);
  assert.equal(looksLikeGeminiKey("sk-proj-example"), false);
});

function formHtml(items, title = "Test formu") {
  const data = []; data[1] = []; data[1][1] = items; data[3] = title;
  return `<script>FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(data)};</script>`;
}
const SYSTEM_ITEMS = [
  [null, "Anonim kodunuz", null, 0, [[101, [], 1]]],
  [null, "Model", null, 0, [[104, [], 0]]],
  [null, "Deneme sayısı", null, 0, [[105, [], 0]]],
];

test("parses text, choice and grid rows and marks system fields", () => {
  const { parseForm, checkFormReady } = runtime();
  const parsed = parseForm(formHtml([
    ...SYSTEM_ITEMS,
    [null, "Seçimin", null, 2, [[102, [["A"], ["B"], ["", null, null, null, 1]], 1]]],
    [null, "Tablo", null, 7, [[103, [["1"], ["2"]], 1, ["Satır 1"]]]],
  ]));
  assert.equal(parsed.title, "Test formu");
  assert.equal(parsed.questions.length, 5);
  assert.deepEqual(Array.from(parsed.questions.slice(0, 3), q => q.autofill), ["anon", "model", "attempts"]);
  assert.deepEqual(Array.from(parsed.questions[3].options), ["A", "B"], "boş 'Diğer' seçeneği elenmeli");
  assert.match(parsed.questions[4].title, /Satır 1/);
  assert.equal(checkFormReady(parsed), null);
});

test("a survey question that merely mentions 'model' is not treated as a system field", () => {
  const { parseForm } = runtime();
  const parsed = parseForm(formHtml([
    [null, "Yapay zekâ modelleri hakkında ne düşünüyorsun?", null, 0, [[200, [], 1]]],
    ...SYSTEM_ITEMS,
  ]));
  assert.equal(parsed.questions[0].autofill, undefined);
  assert.equal(parsed.questions[2].autofill, "model");
});

test("rejects forms missing system fields or with unsupported required questions", () => {
  const { parseForm, checkFormReady } = runtime();
  const noSystem = checkFormReady(parseForm(formHtml([[null, "Görüş", null, 1, [[1, [], 1]]]])));
  assert.ok(noSystem);
  assert.match(noSystem.detail, /Anonim kodunuz/);
  assert.match(noSystem.detail, /Model/);
  assert.match(noSystem.detail, /Deneme sayısı/);
  const withDate = checkFormReady(parseForm(formHtml([...SYSTEM_ITEMS, [null, "Doğum tarihi", null, 9, [[9, null, 1]]], [null, "Görüş", null, 1, [[1, [], 1]]]])));
  assert.ok(withDate);
  assert.match(withDate.detail, /Doğum tarihi/);
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

test("calls the single fixed Gemini model with the key in a header, never in the URL", async () => {
  let seenUrl, seenOptions;
  const fetch = async (url, options) => {
    seenUrl = url; seenOptions = options;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "düşünce", thought: true }, { text: "{}" }] } }] }) };
  };
  const { callLLM, MODEL } = runtime({ fetch });
  const controller = new AbortController();
  const out = await callLLM("prompt", "AIzaKEY", controller.signal);
  assert.equal(out, "{}", "düşünce parçaları çıktıya karışmamalı");
  assert.match(seenUrl, new RegExp("/models/" + MODEL + ":generateContent$"));
  assert.doesNotMatch(seenUrl, /key=/);
  assert.equal(seenOptions.headers["x-goog-api-key"], "AIzaKEY");
  assert.equal(seenOptions.signal, controller.signal);
});

test("never falls back to another model", async () => {
  const calls = [];
  const fetch = async url => { calls.push(url); return { ok: false, status: 404, json: async () => ({ error: { message: "model not found" } }) }; };
  const { callLLM } = runtime({ fetch });
  await assert.rejects(callLLM("p", "AIzaKEY"), /araştırmacına bildir/);
  assert.equal(calls.length, 1);
});

test("maps quota, overload and key errors to clear messages", () => {
  const { llmError } = runtime();
  assert.match(llmError(429, "quota exceeded for model").message, /kullanım sınırı/);
  assert.match(llmError(503, "overloaded").message, /yoğun/);
  assert.match(llmError(400, "API key not valid").message, /API anahtarı/);
});

test("fills anonymous code, model and attempt count into the submission", () => {
  const { buildSubmission, S, MODEL } = runtime();
  S.pages = 2; S.attempts = 3;
  S.questions = [
    { entryId: "101", title: "Anonim kodunuz", type: 0, options: [], required: true, autofill: "anon" },
    { entryId: "104", title: "Model", type: 0, options: [], required: false, autofill: "model" },
    { entryId: "105", title: "Deneme sayısı", type: 0, options: [], required: false, autofill: "attempts" },
    { entryId: "1", title: "Soru", type: 4, options: ["A", "B"], required: true },
  ];
  S.answers = { 1: ["A", "B"] };
  const vals = JSON.parse(JSON.stringify(buildSubmission()));
  assert.deepEqual(vals.filter(([k]) => k === "entry.101").map(x => x[1]), ["ANON-1"]);
  assert.deepEqual(vals.filter(([k]) => k === "entry.104").map(x => x[1]), [MODEL]);
  assert.deepEqual(vals.filter(([k]) => k === "entry.105").map(x => x[1]), ["3"]);
  assert.deepEqual(vals.filter(([k]) => k === "entry.1").map(x => x[1]), ["A", "B"]);
  assert.deepEqual(vals.find(([k]) => k === "pageHistory"), ["pageHistory", "0,1"]);
});

test("form proxy cannot be overridden from the page URL", () => {
  const { FORM_PROXY } = runtime({ location: { search: "?proxy=https://evil.example/x" } });
  assert.match(FORM_PROXY, /^https:\/\/script\.google\.com\/macros\/s\//);
  assert.doesNotMatch(source, /get\("proxy"\)/);
});

test("version is consistent across page signature, log and package.json", () => {
  const { TOOL_VERSION } = runtime();
  const imza = fs.readFileSync(new URL("../imza.js", import.meta.url), "utf8");
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(imza, new RegExp("SURUM = '" + TOOL_VERSION.replace(".", "\\.") + "'"));
  assert.equal(pkg.version, TOOL_VERSION + ".0");
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
