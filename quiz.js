const TOTAL = 7;
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyrrMaEKgszpI2qssVXfg8wk1ZcB03O7trsFuJvvSFOROpxNGxYPB55R9w9KCqRTJXfHA/exec';

const LABELS = {
  1: { zero: 'Não trabalhamos com isso', ate20k: 'Até R$20k', '20k-100k': 'Entre R$20k e R$100k', '100k-500k': 'Entre R$100k e R$500k', acima500k: 'Acima de R$500k' },
  2: { onco: 'Oncologia / Reumatologia / Hematologia / Imunologia', 'clinica-geral': 'Clínica Médica Geral ou Multiespecialidade', estetica: 'Estética ou Odontológica', outra: 'Outra' },
  3: { ate10: 'Até 10', '10-30': 'Entre 10 e 30', '30-80': 'Entre 30 e 80', acima80: 'Acima de 80' },
  4: { 'sim-otimizado': 'Sim, está tudo revisado e otimizado', 'sim-incerto': 'Fizemos uma revisão, mas não sei se está no melhor modelo', nunca: 'Nunca fizemos uma revisão formal', 'nao-sei': 'Não sei responder' },
  5: { 'controle-total': 'Tenho controle total, sei exatamente onde cada real vai', 'visao-geral': 'Tenho uma visão geral, mas nunca fiz uma revisão profunda', 'sei-desperdicio': 'Sei que tem desperdício, mas não sei exatamente onde', 'nunca-olhei': 'Nunca parei para olhar isso com cuidado' },
  6: { 'sim-varias': 'Sim, mais de uma vez', 'sim-uma': 'Sim, uma vez', medo: 'Não, mas tenho medo que isso aconteça', nao: 'Não, nunca contratei nada do tipo' },
  7: { sim: 'Sim, quero entender como isso funciona', curioso: 'Tenho curiosidade, mas ainda sou cético', depende: 'Depende do que está envolvido', nao: 'Não, não é o momento agora' }
};

const state = { nome: '', whatsapp: '', clinica: '', respostas: {} };

function enviarParaPlanilha(payload) {
  fetch(SHEET_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).catch(() => {});
}

/* ── helpers ── */
function showStep(id) {
  document.querySelectorAll('.quiz-step').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('step-' + id);
  if (!el) return;
  el.classList.add('active');
  // Move focus to first focusable element for screen readers
  const first = el.querySelector('input, button, [tabindex="0"]');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
}

function setProgress(n) {
  const pct = ((n - 1) / TOTAL) * 100;
  document.querySelectorAll('.progress-fill').forEach(el => el.style.width = pct + '%');
  document.querySelectorAll('.progress-label').forEach(el => el.textContent = `${n} de ${TOTAL}`);
}

function fieldError(inputId, msg) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(inputId + '-error');
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', inputId + '-error');
  errEl.textContent = msg;
  errEl.classList.add('visible');
  input.focus();
}

function clearError(inputId) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(inputId + '-error');
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
  errEl.classList.remove('visible');
}

function quizError(stepId, msg) {
  const errEl = document.getElementById('error-' + stepId);
  if (!errEl) return;
  errEl.textContent = msg;
  errEl.classList.add('visible');
  errEl.setAttribute('role', 'alert');
}

function clearQuizError(stepId) {
  const errEl = document.getElementById('error-' + stepId);
  if (!errEl) return;
  errEl.classList.remove('visible');
  errEl.removeAttribute('role');
}

/* ── identificação ── */
function avancarIdentificacao() {
  const nome = document.getElementById('q-nome').value.trim();
  const wpp  = document.getElementById('q-wpp').value.trim();
  const clin = document.getElementById('q-clinica').value.trim();

  clearError('q-nome'); clearError('q-wpp'); clearError('q-clinica');

  let valid = true;
  if (!nome) { fieldError('q-nome', 'Por favor, informe seu nome.'); valid = false; }
  if (!wpp)  { fieldError('q-wpp',  'Por favor, informe seu WhatsApp.'); valid = false; }
  if (!clin) { fieldError('q-clinica', 'Por favor, informe o nome da clínica.'); valid = false; }
  if (!valid) return;

  state.nome = nome; state.whatsapp = wpp; state.clinica = clin;

  enviarParaPlanilha({
    tipo: 'lead',
    data: new Date().toLocaleString('pt-BR'),
    nome: state.nome,
    whatsapp: state.whatsapp,
    clinica: state.clinica
  });

  showStep(1);
  setProgress(1);
}

/* ── seleção de opção ── */
function selecionarOpcao(pergunta, opcaoEl, valor) {
  document.querySelectorAll(`#step-${pergunta} .opcao`).forEach(o => {
    o.classList.remove('selected');
    o.setAttribute('aria-pressed', 'false');
  });
  opcaoEl.classList.add('selected');
  opcaoEl.setAttribute('aria-pressed', 'true');
  state.respostas[pergunta] = valor;
  clearQuizError(pergunta);
}

/* ── avançar pergunta ── */
function proximaPergunta(atual) {
  if (!state.respostas[atual]) {
    quizError(atual, 'Selecione uma opção para continuar.');
    return;
  }

  enviarParaPlanilha({
    tipo: 'resposta',
    whatsapp: state.whatsapp,
    pergunta: atual,
    resposta: LABELS[atual][state.respostas[atual]] || state.respostas[atual]
  });

  if (atual === TOTAL) { avaliarResultado(); return; }
  showStep(atual + 1);
  setProgress(atual + 1);
}

/* ── voltar pergunta ── */
function voltarPergunta(atual) {
  if (atual === 1) {
    showStep('identificacao');
    return;
  }
  showStep(atual - 1);
  setProgress(atual - 1);
}

function avaliarResultado() {
  showStep('obrigado');
}

/* ── carrossel drag + teclado ── */
function initCarrossel(trackId) {
  const track = document.getElementById(trackId);
  if (!track) return;
  const wrapper = track.parentElement;
  const cardWidth = () => track.querySelector('.carrossel-card')?.offsetWidth + 16 || 336;

  /* drag no desktop */
  let isDragging = false, startX = 0, scrollStart = 0;

  wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    scrollStart = wrapper.scrollLeft;
    wrapper.style.cursor = 'grabbing';
    wrapper.style.scrollSnapType = 'none';
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    wrapper.style.cursor = 'grab';
    wrapper.style.scrollSnapType = 'x mandatory';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    wrapper.scrollLeft = scrollStart - (e.clientX - startX);
  });

  /* teclado */
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      wrapper.scrollBy({ left: cardWidth(), behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      wrapper.scrollBy({ left: -cardWidth(), behavior: 'smooth' });
    }
  });
}

/* ── inputs: limpar erro ao digitar ── */
document.addEventListener('DOMContentLoaded', () => {
  initCarrossel('carrossel-solucoes');
  ['q-nome','q-wpp','q-clinica'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => clearError(id));
  });

  /* ── scroll reveal ── */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ── nav scrolled state ── */
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* ── nav link ativo por seção ── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => sectionObserver.observe(s));
});
