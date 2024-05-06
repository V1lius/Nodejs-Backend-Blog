// Klientas

//Surinkti sukaupta informacija
let storedToken = localStorage.getItem('jwtToken');
let storedUsername = localStorage.getItem('username');

//Nustatyti vartotoja per HTML
const usernameElement = document.getElementById('username');
usernameElement.textContent = storedUsername;

//Uzkrauti puslapi ir js
document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = window.location.origin;
  fetchPosts(baseUrl);

  if (storedToken) {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole == 'admin') {
      showAdminFeatures();
    }
  }

  const form = document.getElementById('new-post-form');
  if (form) {
    form.addEventListener('submit', (event) => createPost(event, baseUrl));
  }

  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', (event) => loginUser(event, baseUrl));

  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', (event) =>
    registerUser(event, baseUrl)
  );
});

// Iraso detales
const postDetailContainer = document.getElementById('post-detail-container');

//Pridedamas sekiklis posto puslapiui
windows.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('post');
  if (postId) {
    showPostDetail(postId);
  }
});

// Istraukti irasus

async function fetchPosts(baseUrl) {
  const res = await fetch(`${baseUrl}/posts`);
  const data = await res.json();
  const postList = document.getElementById('posts-list');
  const isAdmin = localStorage.getItem('userRole') === 'admin';

  if (postList) {
    postList.innerHTML = data
      .map((post, index) => {
        const deleteButtonStyle = isAdmin ? '' : 'display: none';
        const updateButtonStyle = isAdmin ? '' : 'display: none';

        return `
            <div id="${post.id}" class="post">
            <img
              src="${post.imageUrl}"
              alt="Nuotrauka"
            />
            <div class="post-title">
                ${
                  index === 0
                    ? `<h1><a href="/post/${post._id}">${post.title}</a></h1>`
                    : `<h3><a href="/post/${post._id}">${post.title}</a></h3>`
                }
            </div>
            ${
              index === 0
                ? `<span><p>${post.author}</p><p>${post.timestamp}</p></span>`
                : ``
            }
            <div id="admin-buttons">
              <button class="btn" style="${deleteButtonStyle} onClick="deletePost('${
          post._id
        }', '${baseUrl}')">Istrinti</button>
            <button class="btn" style="${deleteButtonStyle} onClick="showUpdateForm('${
          post._id
        }', '${post.title}', '${post.content}')">Atnaujinti</button>
            </div>
            ${index === 0 ? '<hr/>' : ''}
            ${index === 0 ? '<h2>Visi Straipsniai</h2>' : ''}
          </div>
            `;
      })
      .join('');
  }
}

async function createPost(event, baseUrl) {
  event.preventDefault();
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const iamgeUrlInput = document.getElementById('image-url');

  // Pasiimti reiksmes is irasymo laukeliu
  const title = titleInput.value;
  const content = contentInput.value;
  const imageUrl = imageUrlInput.value;

  // uztikrinti kad laukeliai nera tusti
  if (!title || !content || !imageUrl) {
    alert('Prasau uzpildyti visus laukelius.');
    return;
  }

  const newPost = {
    title,
    content,
    imageUrl,
    author: storedUsername,
    timestamp: new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };

  const headers = new Headers({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${storedToken}`,
  });

  const requestOptions = {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(newPost),
  };

  try {
    const response = await fetch(`${baseUrl}/posts`, requestOptions);
    if (!response.ok) {
      const storedRole = localStorage.getItem('userRole');
      console.log(`Klaida kuriant irasa: HTTP Statusas ${response.status}`);
    } else {
      // Isvalyti ivedimo laukelius
      titleInput.value = '';
      contentInput.value = '';
      imageUrlInput.value = '';
      alert('Irasas buvo sekmingai sukurtas!');
    }
  } catch (error) {
    console.log('Buvo patirta klaida paemant duomenis', error);
    alert('Deja, iraso sukurti nepavyko. :(');
  }
  fetchPosts(baseUrl);
}

// Istrinti irasus
async function deletePost(postId, baseUrl) {
  const deleteUrl = `${baseUrl}/posts/${postId}`;
  try {
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    });

    if (response.ok) {
      alert('Irasas sekmingai istrintas!');
      fetchPosts(baseUrl);
    } else {
      alert('Istrinti iraso nepavyko :(');
    }
  } catch (error) {
    console.error(`Klaida ivyko kol buvo trinamas irasas: ${error}`);
    alert('Deja, istrinti iraso nepavyko :(');
  }
}

// Formos atnaujinimas
function showUpdateForm(postId, title, content) {
  const updateForm = `
    <form id="update-form">
        <input type="text" id="update-title" value="${title} />
        <textarea id="update-content">${content}</textarea>
        <button type="submit">Atnaujinti irasa</button>
    </form>
  `;

  const postElement = document.getElementById(postId);
  postElement.innerHTML += updateForm;

  const form = document.getElementById('update-form');
  form.addEventListener('submit', (event) => updateForm(event, postId));
}

// Atnaujinti irasa
async function updatePost(event, postId) {
  event.preventDefault();
  const title = document.getElementById('update-title').value;
  const content = document.getElementById('update-content').value;
  const baseUrl = windows.location.origin;

  //uztikrinti jog laukeliai nera tusti
  if (!title || !content) {
    alert('Prasau suvesti visus laukelius');
    return;
  }

  const updatedPost = {
    title,
    content,
  };

  try {
    const response = await fetch(`${baseUrl}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    });

    if (response.ok) {
      alert('Irasas sekmingai istrintas!');
      fetchPosts(baseUrl);
    } else {
      alert('Istrinti iraso nepavyko :(');
    }
  } catch (error) {
    console.error(`Klaida ivyko kol buvo trinamas irasas: ${error}`);
    alert('Deja, istrinti iraso nepavyko :(');
  }
}
