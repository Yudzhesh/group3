const LessonEngine = {
  state: { currentStep: 0, score: 0, attempts: 0, streak: 0, answered: false, selectedAnswer: null, matchSelections: {}, isTeacherMode: false },
  init(data) {
    this.data = data;
    this.loadStats();
    if (window.location.search.includes('mode=teacher')) {
      this.state.isTeacherMode = true;
      document.body.classList.add('teacher-mode');
    }
    this.renderStats();
    this.renderTask(0);
  },
  loadStats() {
    const key = 'ss_stats_' + (this.data.id || 'default');
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      this.state.score = saved.score || 0;
      this.state.attempts = saved.attempts || 0;
      this.state.streak = saved.streak || 0;
    } catch(e) {}
  },
  saveStats() {
    const key = 'ss_stats_' + (this.data.id || 'default');
    localStorage.setItem(key, JSON.stringify({ score: this.state.score, attempts: this.state.attempts, streak: this.state.streak }));
  },
  renderStats() {
    const statContainer = document.getElementById('stats');
    if (statContainer) {
      statContainer.innerHTML = `
        <div class="stat-item">✅ Верно: ${this.state.score}</div>
        <div class="stat-item">📊 Попыток: ${this.state.attempts}</div>
        <div class="stat-item">🔥 Серия: ${this.state.streak}</div>
      `;
    }
  },
  renderTask(index) {
    const task = this.data.tasks[index];
    if (!task) { this.renderComplete(); return; }
    this.state.currentStep = index;
    this.state.answered = false;
    this.state.selectedAnswer = null;
    this.state.matchSelections = {};
    
    const container = document.getElementById('task-container');
    let html = '<div class="task-block">';
    
    let badge = '';
    if (task.level) badge = `<span class="badge badge-${task.level.toLowerCase()}">Уровень ${task.level}</span>`;
    html += `<div class="task-question">${badge}${task.q}</div>`;

    if (task.type === 'choice') {
      html += `<div class="options-list">`;
      task.options.forEach(opt => {
        html += `<button class="option-btn" onclick="LessonEngine.selectOption(this, '${opt.replace(/'/g, "\\'")}')">${opt}</button>`;
      });
      html += `</div>`;
    } else if (task.type === 'input') {
      html += `<input type="text" class="input-answer" id="input-answer" placeholder="Ваш ответ...">`;
    } else if (task.type === 'open') {
      html += `<textarea class="open-answer" id="open-answer" placeholder="Пишите своими словами..."></textarea>`;
    } else if (task.type === 'match') {
      task.pairs.forEach((pair, i) => {
        html += `<div class="match-row"><div class="match-left">${pair.left}</div><div class="match-right">`;
        html += `<select class="match-select" onchange="LessonEngine.setMatch(${i}, this.value)"><option value="">Выберите...</option>`;
        task.options.forEach(opt => { html += `<option value="${opt}">${opt}</option>`; });
        html += `</select></div></div>`;
      });
    }

    if (task.teacherNote) {
      html += `<div class="teacher-note"><strong>Методическая пометка:</strong><br>${task.teacherNote}</div>`;
    }
    if (task.solution) {
      html += `<div class="teacher-answer"><strong>Ответ:</strong><br>${task.solution}</div>`;
    }

    html += `<div class="actions" id="actions">`;
    html += `<button class="btn btn-primary btn-check" id="btn-check" onclick="LessonEngine.checkAnswer()">Проверить</button>`;
    if (task.hint) html += `<button class="btn btn-secondary btn-hint" id="btn-hint" onclick="LessonEngine.showHint()">Подсказка</button>`;
    html += `</div>`;

    html += `<div class="feedback" id="feedback"></div>`;
    
    html += `<div class="actions next-actions" id="next-actions" style="margin-top:20px; display:none;"><button class="btn btn-primary" onclick="LessonEngine.nextTask()">Следующее задание &rarr;</button></div>`;
    
    if (this.state.isTeacherMode) {
      html += `<div class="actions" style="margin-top:20px;"><button class="btn btn-primary" onclick="LessonEngine.nextTask()">Следующее задание &rarr;</button></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  },
  selectOption(btn, selected) { 
    if (this.state.answered) return;
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected')); 
    btn.classList.add('selected'); 
    this.state.selectedAnswer = selected; 
  },
  setMatch(i, val) { this.state.matchSelections[i] = val; },
  checkAnswer() {
    const task = this.data.tasks[this.state.currentStep];
    const feedback = document.getElementById('feedback');
    let isCorrect = false;
    let userAnswer = '';

    if (task.type === 'choice') {
      if (!this.state.selectedAnswer) { feedback.className = 'feedback show hint'; feedback.textContent = 'Выберите вариант.'; return; }
      userAnswer = this.state.selectedAnswer;
    } else if (task.type === 'input') {
      userAnswer = document.getElementById('input-answer').value.trim();
      if (!userAnswer) return;
    } else if (task.type === 'open') {
      userAnswer = document.getElementById('open-answer').value.trim();
      if (!userAnswer) return;
    } else if (task.type === 'match') {
      if (Object.keys(this.state.matchSelections).length !== task.pairs.length) { feedback.className = 'feedback show hint'; feedback.textContent = 'Заполните все пары.'; return; }
    }

    this.state.attempts++;

    if (task.type === 'open') { isCorrect = true; }
    else if (task.type === 'match') {
      isCorrect = true;
      task.pairs.forEach((pair, i) => { if (this.state.matchSelections[i] !== pair.correct) isCorrect = false; });
    } else {
      isCorrect = (userAnswer.toLowerCase().replace(/\s+/g, '') === task.a.toLowerCase().replace(/\s+/g, ''));
    }

    if (task.type === 'choice') {
      document.querySelectorAll('.option-btn').forEach(b => {
        b.disabled = true;
        if (b.textContent === task.a) b.classList.add('correct');
        else if (b.textContent === userAnswer && !isCorrect) b.classList.add('incorrect');
      });
    }

    if (isCorrect) { this.state.score++; this.state.streak++; feedback.className = 'feedback show success'; feedback.innerHTML = `<strong>Верно!</strong> ${task.hint || ''}`; }
    else { this.state.streak = 0; feedback.className = 'feedback show error'; feedback.innerHTML = `<strong>Не совсем.</strong> ${task.hint || 'Попробуйте еще раз.'}`; }

    this.saveStats(); this.renderStats();

    document.getElementById('btn-check').style.display = 'none';
    const hb = document.getElementById('btn-hint'); if (hb) hb.style.display = 'none';
    document.getElementById('next-actions').style.display = 'flex';
    if (!isCorrect && task.solution) feedback.innerHTML += `<br><br><em>Разбор: ${task.solution}</em>`;
  },
  showHint() {
    const task = this.data.tasks[this.state.currentStep];
    const feedback = document.getElementById('feedback');
    feedback.className = 'feedback show hint'; feedback.textContent = task.hint || 'Перечитайте теорию.';
  },
  nextTask() { 
    this.renderTask(this.state.currentStep + 1); 
    
    const taskContainer = document.getElementById('block-4');
    if (taskContainer) {
      const yOffset = -80;
      const y = taskContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  },
  renderComplete() {
    document.getElementById('task-container').innerHTML = `<div class="example" style="text-align:center; padding: 40px;"><h2 style="font-family:'Montserrat'; margin-bottom:15px; color:var(--success);">Урок завершен!</h2><p>Вы отлично поработали. Не забудьте выполнить самостоятельную работу.</p></div>`;
    document.getElementById('block-5').style.display = 'block';
  }
};

function scrollToBlock(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}