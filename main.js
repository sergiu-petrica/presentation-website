// Auto-calculate duration for "Present" entries
document.querySelectorAll('.duration[data-start]').forEach(el => {
    const [startY, startM] = el.dataset.start.split('-').map(Number);
    const now = new Date();
    let months = (now.getFullYear() - startY) * 12 + (now.getMonth() + 1 - startM);

    if (months < 1) months = 1;

    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts = [];

    if (y > 0) parts.push(y === 1 ? '1 year' : `${y} years`);

    if (m > 0) parts.push(m === 1 ? '1 month' : `${m} months`);

    el.textContent = parts.join(' ');
});

// Project card click behavior
document.querySelectorAll('.project-card[data-action]').forEach(card => {
    card.addEventListener('click', e => {
        if (e.target.closest('a')) return;

        const action = card.dataset.action;

        if (action === 'link') {
            window.open(card.dataset.href, '_blank', 'noopener');
        }
    });
});
