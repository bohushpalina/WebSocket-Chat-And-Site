const mainForm = document.getElementById('main-form');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const editIdInput = document.getElementById('edit-id');
const formTitle = document.getElementById('form-title');


function showSection(sectionId) {
    document.querySelectorAll('.spa-section').forEach(section => {
        section.style.display = 'none';
    });
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0); 
        window.location.hash = sectionId;
    }
}

function startEdit(id, title, description) {
    document.getElementById('title').value = title;
    document.getElementById('description').value = description;
    editIdInput.value = id;

    formTitle.textContent = "Корректура издания";
    submitBtn.textContent = 'СОХРАНИТЬ ИЗМЕНЕНИЯ';
    cancelBtn.style.display = 'block';
    
    showSection('form-section');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

cancelBtn.addEventListener('click', () => {
    mainForm.reset();
    editIdInput.value = '';
    formTitle.textContent = "Регистрация нового издания";
    submitBtn.textContent = 'ДОБАВИТЬ В АРХИВ';
    cancelBtn.style.display = 'none';
    
    showSection('list-section');
});


mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = editIdInput.value;
    const data = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/items/${id}` : '/items';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            window.location.reload();
        } else {
            const errData = await response.json();
            alert('Ошибка: ' + (errData.error || 'Не удалось сохранить данные'));
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
        alert('Ошибка сети при попытке сохранения');
    }
});

async function deleteItem(id) {
    if (!confirm('Вы уверены, что хотите списать это издание в архивный утиль?')) return;

    try {
        const response = await fetch(`/items/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const card = document.querySelector(`.item-card[data-id="${id}"]`);
            if (card) card.remove();
        } else {
            alert('Не удалось удалить издание');
        }
    } catch (err) {
        console.error('Ошибка при удалении:', err);
        alert('Ошибка сети при удалении');
    }
}

function handleHashChange() {
    const hash = window.location.hash.replace('#', '');

    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else {
        showSection('list-section'); // дефолт
    }
}

window.addEventListener('hashchange', handleHashChange);
window.addEventListener('load', handleHashChange);
