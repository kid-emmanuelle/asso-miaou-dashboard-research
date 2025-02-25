document.getElementById('start-date').addEventListener('change', function() {
    const date = new Date(this.value);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    this.value = formattedDate.split('/').reverse().join('-'); // Reformat to yyyy-MM-dd for input value
    this.setAttribute('data-formatted', formattedDate); // Store formatted date
});

document.getElementById('end-date').addEventListener('change', function() {
    const date = new Date(this.value);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    this.value = formattedDate.split('/').reverse().join('-'); // Reformat to yyyy-MM-dd for input value
    this.setAttribute('data-formatted', formattedDate); // Store formatted date
});

function showNotification(message) {
    var notification = document.createElement('div');
    notification.className = 'notification-popup';
    notification.innerText = message;

    var closeButton = document.createElement('button');
    closeButton.innerText = 'X';
    closeButton.className = 'close-button';
    closeButton.onclick = function() {
        document.body.removeChild(notification);
    };

    notification.appendChild(closeButton);
    document.body.appendChild(notification);

    setTimeout(function() {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 2000);
}