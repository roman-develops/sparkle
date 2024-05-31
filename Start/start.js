document.getElementById('sparkle-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const endpoint = document.getElementById('endpoint').value;
    const linkPrefix = document.getElementById('link-prefix').value;
    const startResource = document.getElementById('start-resource').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    localStorage.setItem('endpoint', endpoint);
    localStorage.setItem('link-prefix', linkPrefix);
    localStorage.setItem('start-resource', startResource);
    localStorage.setItem('username', username);
    localStorage.setItem('password', password);
    
    window.open('../Graph/graph.html', '_blank');
});
