// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAEDJkwaThWJNm8lQbOLxb-JSTQ45dbHOw",
    authDomain: "thing-672ba.firebaseapp.com",
    projectId: "thing-672ba",
    storageBucket: "thing-672ba.firebasestorage.app",
    messagingSenderId: "790564641174",
    appId: "1:790564641174:web:8524eac8fd19a7efffe5b7",
    measurementId: "G-JG0PV4KYPN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Admin email - UPDATE THIS WITH YOUR EMAIL
const ADMIN_EMAIL = "joykumbhakar101@gmail.com";

let currentUser = null;

// Auth state observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUIForAuth(user);
    if (user) {
        loadPosts();
    }
});

// Update UI based on auth state
function updateUIForAuth(user) {
    const authContainer = document.getElementById('auth-container');
    const postForm = document.getElementById('post-form');

    if (user) {
        authContainer.innerHTML = `
            <div class="user-profile">
                <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar">
                <span style="margin-right: 1rem;">${user.displayName}</span>
                <button class="auth-button" id="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </div>
        `;
        postForm.classList.remove('hidden');

        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    } else {
        authContainer.innerHTML = `
            <button class="auth-button" id="login-btn">
                <i class="fab fa-google"></i> Sign In
            </button>
        `;
        postForm.classList.add('hidden');

        document.getElementById('login-btn').addEventListener('click', () => {
            document.getElementById('auth-modal').classList.add('active');
        });
    }
}

// Handle Google Sign In
document.getElementById('google-signin').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
        document.getElementById('auth-modal').classList.remove('active');
    } catch (error) {
        console.error('Error signing in:', error);
        alert('Failed to sign in. Please try again.');
    }
});

// Handle logout
async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Close modal
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('auth-modal').classList.remove('active');
});

// Close modal on outside click
document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') {
        document.getElementById('auth-modal').classList.remove('active');
    }
});

// Handle post submission
document.getElementById('submit-post').addEventListener('click', async () => {
    const content = document.getElementById('post-content').value.trim();
    
    if (!content) {
        alert('Please write something before posting!');
        return;
    }

    if (!currentUser) {
        alert('Please sign in to post!');
        return;
    }

    try {
        await addDoc(collection(db, 'posts'), {
            content: content,
            authorName: currentUser.displayName,
            authorEmail: currentUser.email,
            authorPhoto: currentUser.photoURL,
            isAdmin: currentUser.email === ADMIN_EMAIL,
            likes: [],
            replies: [],
            timestamp: serverTimestamp()
        });

        document.getElementById('post-content').value = '';
        loadPosts();
    } catch (error) {
        console.error('Error posting:', error);
        alert('Failed to post. Please try again.');
    }
});

// Load posts
async function loadPosts() {
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = '<p style="text-align: center; color: #a0aec0;">Loading posts...</p>';

    try {
        const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            postsContainer.innerHTML = '<p style="text-align: center; color: #a0aec0;">No posts yet. Be the first to share!</p>';
            return;
        }

        postsContainer.innerHTML = '';
        
        querySnapshot.forEach((docSnapshot) => {
            const post = docSnapshot.data();
            const postId = docSnapshot.id;
            renderPost(post, postId);
        });
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = '<p style="text-align: center; color: #f87171;">Failed to load posts.</p>';
    }
}

// Render a post
function renderPost(post, postId) {
    const postsContainer = document.getElementById('posts-container');
    const isLiked = currentUser && post.likes && post.likes.includes(currentUser.email);
    const likesCount = post.likes ? post.likes.length : 0;
    const repliesCount = post.replies ? post.replies.length : 0;

    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.innerHTML = `
        <div class="post-header">
            <img src="${post.authorPhoto || 'https://via.placeholder.com/48'}" alt="${post.authorName}" class="post-avatar">
            <div class="post-author-info">
                <div>
                    <span class="post-author">${post.authorName}</span>
                    ${post.isAdmin ? '<span class="admin-badge"><i class="fas fa-shield-alt"></i> Admin</span>' : ''}
                </div>
                <div class="post-time">
                    <i class="far fa-clock"></i> ${post.timestamp ? formatTimestamp(post.timestamp) : 'Just now'}
                </div>
            </div>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions-bar">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${postId}')">
                <i class="fa${isLiked ? 's' : 'r'} fa-heart"></i> ${likesCount}
            </button>
            <button class="action-btn" onclick="toggleReplyForm('${postId}')">
                <i class="far fa-comment"></i> ${repliesCount}
            </button>
        </div>
        <div class="reply-form" id="reply-form-${postId}">
            <input type="text" class="reply-input" id="reply-input-${postId}" placeholder="Write a reply...">
            <button class="reply-submit" onclick="submitReply('${postId}')">
                <i class="fas fa-paper-plane"></i> Reply
            </button>
        </div>
        <div class="replies" id="replies-${postId}">
            ${renderReplies(post.replies || [])}
        </div>
    `;

    postsContainer.appendChild(postElement);
}

// Render replies
function renderReplies(replies) {
    if (!replies || replies.length === 0) return '';
    
    return replies.map(reply => `
        <div class="reply">
            <div class="post-header" style="margin-bottom: 0.5rem;">
                <img src="${reply.authorPhoto || 'https://via.placeholder.com/32'}" alt="${reply.authorName}" class="post-avatar" style="width: 32px; height: 32px;">
                <div class="post-author-info">
                    <div>
                        <span class="post-author">${reply.authorName}</span>
                        ${reply.isAdmin ? '<span class="admin-badge"><i class="fas fa-shield-alt"></i> Admin</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="post-content" style="margin-bottom: 0;">${escapeHtml(reply.content)}</div>
        </div>
    `).join('');
}

// Toggle like
window.toggleLike = async function(postId) {
    if (!currentUser) {
        alert('Please sign in to like posts!');
        return;
    }

    try {
        const postRef = doc(db, 'posts', postId);
        const q = query(collection(db, 'posts'));
        const querySnapshot = await getDocs(q);
        const postDoc = querySnapshot.docs.find(d => d.id === postId);
        
        if (!postDoc) return;
        
        const post = postDoc.data();
        const likes = post.likes || [];
        const userEmail = currentUser.email;
        
        if (likes.includes(userEmail)) {
            await updateDoc(postRef, {
                likes: likes.filter(email => email !== userEmail)
            });
        } else {
            await updateDoc(postRef, {
                likes: arrayUnion(userEmail)
            });
        }
        
        loadPosts();
    } catch (error) {
        console.error('Error toggling like:', error);
    }
};

// Toggle reply form
window.toggleReplyForm = function(postId) {
    const form = document.getElementById(`reply-form-${postId}`);
    form.classList.toggle('active');
};

// Submit reply
window.submitReply = async function(postId) {
    if (!currentUser) {
        alert('Please sign in to reply!');
        return;
    }

    const input = document.getElementById(`reply-input-${postId}`);
    const content = input.value.trim();
    
    if (!content) {
        alert('Please write something before replying!');
        return;
    }

    try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            replies: arrayUnion({
                content: content,
                authorName: currentUser.displayName,
                authorEmail: currentUser.email,
                authorPhoto: currentUser.photoURL,
                isAdmin: currentUser.email === ADMIN_EMAIL,
                timestamp: new Date().toISOString()
            })
        });

        input.value = '';
        loadPosts();
    } catch (error) {
        console.error('Error posting reply:', error);
        alert('Failed to post reply. Please try again.');
    }
};

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Three.js Scene Setup - Main Background
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

camera.position.z = 30;

// Create particles
const particlesGeometry = new THREE.BufferGeometry();
const particleCount = 2000;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 100;
    positions[i + 1] = (Math.random() - 0.5) * 100;
    positions[i + 2] = (Math.random() - 0.5) * 100;

    colors[i] = 0.4 + Math.random() * 0.6;
    colors[i + 1] = 0.5 + Math.random() * 0.5;
    colors[i + 2] = 0.9 + Math.random() * 0.1;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// THREE.JS HERO SECTION - Separate canvas for hero
const heroCanvas = document.getElementById('hero-canvas');
const heroScene = new THREE.Scene();
const heroCamera = new THREE.PerspectiveCamera(75, heroCanvas.clientWidth / heroCanvas.clientHeight, 0.1, 1000);
const heroRenderer = new THREE.WebGLRenderer({ 
    canvas: heroCanvas,
    alpha: true, 
    antialias: true 
});

heroRenderer.setSize(heroCanvas.clientWidth, heroCanvas.clientHeight);
heroRenderer.setPixelRatio(window.devicePixelRatio);
heroCamera.position.z = 25;

// Create central glowing sphere with rings
const centralSphere = new THREE.Group();

// Main sphere
const mainSphereGeo = new THREE.SphereGeometry(4, 32, 32);
const mainSphereMat = new THREE.MeshBasicMaterial({
    color: 0x667eea,
    transparent: true,
    opacity: 0.3,
    wireframe: true
});
const mainSphere = new THREE.Mesh(mainSphereGeo, mainSphereMat);
centralSphere.add(mainSphere);

// Outer glow sphere
const glowSphereGeo = new THREE.SphereGeometry(5, 32, 32);
const glowSphereMat = new THREE.MeshBasicMaterial({
    color: 0xa78bfa,
    transparent: true,
    opacity: 0.1,
    wireframe: true
});
const glowSphere = new THREE.Mesh(glowSphereGeo, glowSphereMat);
centralSphere.add(glowSphere);

// Rings around sphere
for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(6 + i * 1.5, 0.1, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.7 + i * 0.1, 0.8, 0.6),
        transparent: true,
        opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + (i * 0.3);
    ring.rotation.y = i * 0.5;
    centralSphere.add(ring);
}

heroScene.add(centralSphere);

// Create tech icons as large 3D shapes
const techIcons = [
    { shape: 'cone', color: 0xe34c26, name: 'HTML' },
    { shape: 'box', color: 0x264de4, name: 'CSS' },
    { shape: 'octahedron', color: 0xf0db4f, name: 'JavaScript' },
    { shape: 'tetrahedron', color: 0x61dafb, name: 'React' },
    { shape: 'dodecahedron', color: 0x3178c6, name: 'TypeScript' },
    { shape: 'torus', color: 0x68a063, name: 'Node.js' },
    { shape: 'sphere', color: 0xff6c37, name: 'Git' },
    { shape: 'cylinder', color: 0xff9900, name: 'AWS' }
];

const heroIcons = [];
techIcons.forEach((tech, i) => {
    let iconGeometry;
    
    switch(tech.shape) {
        case 'cone':
            iconGeometry = new THREE.ConeGeometry(1.2, 2.5, 4);
            break;
        case 'box':
            iconGeometry = new THREE.BoxGeometry(2, 2, 2);
            break;
        case 'octahedron':
            iconGeometry = new THREE.OctahedronGeometry(1.5);
            break;
        case 'tetrahedron':
            iconGeometry = new THREE.TetrahedronGeometry(1.8);
            break;
        case 'dodecahedron':
            iconGeometry = new THREE.DodecahedronGeometry(1.3);
            break;
        case 'torus':
            iconGeometry = new THREE.TorusGeometry(1.2, 0.4, 16, 100);
            break;
        case 'sphere':
            iconGeometry = new THREE.SphereGeometry(1.3, 16, 16);
            break;
        case 'cylinder':
            iconGeometry = new THREE.CylinderGeometry(1, 1, 2, 8);
            break;
    }
    
    // Solid version
    const solidMat = new THREE.MeshBasicMaterial({
        color: tech.color,
        transparent: true,
        opacity: 0.3
    });
    const solidIcon = new THREE.Mesh(iconGeometry, solidMat);
    
    // Wireframe version
    const wireMat = new THREE.MeshBasicMaterial({
        color: tech.color,
        wireframe: true,
        transparent: true,
        opacity: 0.9
    });
    const wireIcon = new THREE.Mesh(iconGeometry.clone(), wireMat);
    
    const iconGroup = new THREE.Group();
    iconGroup.add(solidIcon);
    iconGroup.add(wireIcon);
    
    const angle = (i / techIcons.length) * Math.PI * 2;
    const radius = 14;
    iconGroup.position.x = Math.cos(angle) * radius;
    iconGroup.position.y = Math.sin(angle) * radius;
    iconGroup.position.z = Math.sin(angle * 2) * 4;
    
    iconGroup.userData = { 
        angle: angle,
        radius: radius,
        baseY: Math.sin(angle) * radius,
        rotationSpeed: 0.02 + Math.random() * 0.02
    };
    
    heroIcons.push(iconGroup);
    heroScene.add(iconGroup);
});

// Add connection lines between icons
const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x667eea,
    transparent: true,
    opacity: 0.2
});

const lineGeometries = [];
for (let i = 0; i < heroIcons.length; i++) {
    for (let j = i + 1; j < heroIcons.length; j++) {
        const points = [];
        points.push(heroIcons[i].position);
        points.push(heroIcons[j].position);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, lineMaterial);
        heroScene.add(line);
        lineGeometries.push({ line, icon1: heroIcons[i], icon2: heroIcons[j] });
    }
}

// Mouse and touch interaction
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

function handlePointerMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    targetMouseX = (clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(clientY / window.innerHeight) * 2 + 1;
}

document.addEventListener('mousemove', handlePointerMove);
document.addEventListener('touchmove', handlePointerMove, { passive: true });
document.addEventListener('touchstart', handlePointerMove, { passive: true });

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Smooth mouse follow
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Background particles animation
    particles.rotation.y += 0.001;
    particles.rotation.x += 0.0005;

    const positions = particles.geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
        positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.01;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 5 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);

    // Hero section animation
    const time = Date.now() * 0.001;

    // Rotate central sphere and rings
    centralSphere.rotation.y += 0.005;
    centralSphere.rotation.x = Math.sin(time * 0.5) * 0.1;
    centralSphere.children.forEach((child, i) => {
        if (child.geometry.type === 'TorusGeometry') {
            child.rotation.z += 0.01 * (i + 1);
        }
    });

    // Animate tech icons orbiting and rotating
    heroIcons.forEach((iconGroup, i) => {
        const data = iconGroup.userData;
        
        // Orbit animation
        data.angle += 0.003;
        iconGroup.position.x = Math.cos(data.angle) * data.radius;
        iconGroup.position.y = Math.sin(data.angle) * data.radius;
        iconGroup.position.z = Math.sin(data.angle * 2) * 4 + Math.sin(time + i) * 2;
        
        // Individual rotation
        iconGroup.rotation.x += data.rotationSpeed;
        iconGroup.rotation.y += data.rotationSpeed;
        iconGroup.rotation.z += data.rotationSpeed * 0.5;
        
        // Pulsing effect
        const scale = 1 + Math.sin(time * 2 + i) * 0.1;
        iconGroup.scale.set(scale, scale, scale);
    });

    // Update connection lines
    lineGeometries.forEach(({ line, icon1, icon2 }) => {
        const points = [icon1.position, icon2.position];
        line.geometry.setFromPoints(points);
    });

    // Camera follows mouse in hero section
    heroCamera.position.x += (mouseX * 3 - heroCamera.position.x) * 0.05;
    heroCamera.position.y += (-mouseY * 3 - heroCamera.position.y) * 0.05;
    heroCamera.lookAt(heroScene.position);

    heroRenderer.render(heroScene, heroCamera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    // Background scene resize
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Hero scene resize
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
        heroCamera.aspect = heroCanvas.clientWidth / heroCanvas.clientHeight;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(heroCanvas.clientWidth, heroCanvas.clientHeight);
    }
});

// Initial resize to ensure proper sizing
window.dispatchEvent(new Event('resize'));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});