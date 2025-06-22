
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  const chatDisplay = document.getElementById('chatDisplay');
  const dropdown = document.getElementById('dropdown');
  const manageChatBtn = document.getElementById('manageChat');
  const amnestyBtn = document.getElementById('amnestyButton');
  const doorbellBtn = document.getElementById('doorbellButton');
  const guestModal = document.getElementById('guestModal');
  const guestNameInput = document.getElementById('guestNameInput');
  const acceptGuestBtn = document.getElementById('acceptGuest');
  const rejectGuestBtn = document.getElementById('rejectGuest');

  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.altKey) {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) {
        const now = new Date().toLocaleTimeString();
        const author = "Вы";
        const message = `<div><b>${author} (${now}):</b><br>${text}</div>`;
        chatDisplay.innerHTML = message + "<hr>" + chatDisplay.innerHTML;
        chatInput.value = "";
      }
    } else if (e.key === 'Enter' && e.altKey) {
      chatInput.value += "\n";
    }
  });

  manageChatBtn.addEventListener('click', () => {
    dropdown.innerHTML = `
      <label><input type="checkbox" checked> Лекси</label>
      <label><input type="checkbox" checked> Элион</label>
      <label><input type="checkbox" checked> Гость</label>
    `;
    dropdown.style.display = 'block';
  });

  dropdown.addEventListener('mouseleave', () => {
    dropdown.style.display = 'none';
  });

  doorbellBtn.addEventListener('click', () => {
    guestModal.style.display = 'block';
  });

  acceptGuestBtn.addEventListener('click', () => {
    const guestName = guestNameInput.value.trim() || "Гость";
    const now = new Date().toLocaleTimeString();
    const welcome = `<div><b>Папаша:</b> Приветствуем ${guestName}! (${now})</div>`;
    chatDisplay.innerHTML = welcome + "<hr>" + chatDisplay.innerHTML;
    guestModal.style.display = 'none';
    guestNameInput.value = '';
  });

  rejectGuestBtn.addEventListener('click', () => {
    guestModal.style.display = 'none';
    guestNameInput.value = '';
  });

  amnestyBtn.addEventListener('click', () => {
    const now = new Date().toLocaleTimeString();
    const plea = `<div><b>Вы (${now}):</b> Прошу амнистии!</div>`;
    chatDisplay.innerHTML = plea + "<hr>" + chatDisplay.innerHTML;
  });
}); 

const chatInput = document.getElementById('chatInput');
const chatDisplay = document.getElementById('chatDisplay');

// Подключение к WebSocket-серверу
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
  console.log("✅ WebSocket-соединение установлено");
};

socket.onmessage = (event) => {
  const { author, text, time } = JSON.parse(event.data);
  const message = `<div><b>${author} (${time}):</b><br>${text}</div>`;
  chatDisplay.innerHTML = message + "<hr>" + chatDisplay.innerHTML;
};

socket.onclose = () => {
  console.log("❌ Соединение закрыто");
};

socket.onerror = (error) => {
  console.error("🚨 WebSocket ошибка:", error);
};

// Обработка ввода сообщения
chatInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.altKey) {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) {
      const now = new Date().toLocaleTimeString();
      const message = {
        author: "Вы",
        text: text,
        time: now
      };
      socket.send(JSON.stringify(message));
      chatInput.value = "";
    }
  } else if (e.key === 'Enter' && e.altKey) {
    chatInput.value += "\n";
  }
});
