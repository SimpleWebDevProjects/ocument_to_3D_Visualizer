// DOM Elements
const processBtn = document.getElementById('process-btn');
const sampleBtn = document.getElementById('sample-btn');
const documentInput = document.getElementById('document-input');
const graphContainer = document.getElementById('graph-container');
const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
const closeModal = document.getElementById('close-modal');
const toggleVR = document.getElementById('toggle-vr');
const resetView = document.getElementById('reset-view');
const screenshotBtn = document.getElementById('screenshot');
const nodeInfo = document.getElementById('node-info');
const vrIndicator = document.getElementById('vr-indicator');
const nodeCount = document.getElementById('node-count');
const linkCount = document.getElementById('link-count');

// Three.js variables
let scene, camera, renderer;
let graphNodes = [], graphLinks = [];
let nodeGroup, linkGroup;
let raycaster, mouse;
let selectedNode = null;
let isVREnabled = false;
let autoRotate = true;
let rotationSpeed = 0.5;

// Sample text for demo
const sampleText = `Machine learning (ML) is the study of computer algorithms that can improve automatically through experience and by the use of data. It is seen as a part of artificial intelligence. Machine learning algorithms build a model based on sample data, known as training data, in order to make predictions or decisions without being explicitly programmed to do so. Machine learning algorithms are used in a wide variety of applications, such as in medicine, email filtering, speech recognition, and computer vision, where it is difficult or unfeasible to develop conventional algorithms to perform the needed tasks.`;

// Initialize Three.js
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0f2e);
    scene.fog = new THREE.Fog(0x0c0f2e, 50, 150);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, graphContainer.clientWidth / graphContainer.clientHeight, 0.1, 1000);
    camera.position.z = 80;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(graphContainer.clientWidth, graphContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    graphContainer.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x00c9ff, 0x92fe9d, 0.3);
    scene.add(hemisphereLight);

    // Add stars background
    addStars();

    // Node and link groups
    nodeGroup = new THREE.Group();
    linkGroup = new THREE.Group();
    scene.add(nodeGroup);
    scene.add(linkGroup);

    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);

    // Initialize with sample text
    generateGraph(sampleText);

    // Start animation loop
    animate();
}

// Add stars to background
function addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        transparent: true
    });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

// Generate graph from text
function generateGraph(text) {
    // Clear existing graph
    while (nodeGroup.children.length > 0) {
        nodeGroup.remove(nodeGroup.children[0]);
    }
    while (linkGroup.children.length > 0) {
        linkGroup.remove(linkGroup.children[0]);
    }

    graphNodes = [];
    graphLinks = [];

    // Use compromise.js for NLP
    const doc = window.nlp(text);

    // Extract keywords (nouns and adjectives)
    const keywords = doc.nouns().out('array')
        .concat(doc.adjectives().out('array'))
        .filter((word, index, self) =>
            word.length > 3 && self.indexOf(word) === index
        )
        .slice(0, 20); // Limit to top 20 keywords

    // Create nodes
    keywords.forEach((keyword, index) => {
        const size = Math.max(1, keyword.length / 5);
        const node = {
            id: index,
            name: keyword,
            size: size,
            x: Math.random() * 60 - 30,
            y: Math.random() * 60 - 30,
            z: Math.random() * 60 - 30,
            vx: Math.random() * 0.2 - 0.1,
            vy: Math.random() * 0.2 - 0.1,
            vz: Math.random() * 0.2 - 0.1
        };
        graphNodes.push(node);

        // Create sphere geometry
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.5 + 0.5
            ),
            emissive: new THREE.Color(0x444444),
            shininess: 50
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(node.x, node.y, node.z);
        sphere.userData = node;
        nodeGroup.add(sphere);
    });

    // Create links based on co-occurrence in sentences
    const sentences = doc.sentences().out('array');
    sentences.forEach(sentence => {
        const sentenceKeywords = keywords.filter(keyword =>
            sentence.toLowerCase().includes(keyword.toLowerCase())
        );

        for (let i = 0; i < sentenceKeywords.length; i++) {
            for (let j = i + 1; j < sentenceKeywords.length; j++) {
                const sourceNode = graphNodes.find(n => n.name === sentenceKeywords[i]);
                const targetNode = graphNodes.find(n => n.name === sentenceKeywords[j]);

                if (sourceNode && targetNode) {
                    const linkExists = graphLinks.some(link =>
                        (link.source === sourceNode.id && link.target === targetNode.id) ||
                        (link.source === targetNode.id && link.target === sourceNode.id)
                    );

                    if (!linkExists) {
                        const link = {
                            source: sourceNode.id,
                            target: targetNode.id,
                            strength: 1
                        };
                        graphLinks.push(link);

                        // Create line geometry
                        const source = graphNodes[sourceNode.id];
                        const target = graphNodes[targetNode.id];

                        const geometry = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(source.x, source.y, source.z),
                            new THREE.Vector3(target.x, target.y, target.z)
                        ]);

                        const material = new THREE.LineBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: 0.4
                        });

                        const line = new THREE.Line(geometry, material);
                        linkGroup.add(line);
                    }
                }
            }
        }
    });

    // Update stats
    nodeCount.textContent = graphNodes.length;
    linkCount.textContent = graphLinks.length;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Apply physics
    applyForces();

    // Update node positions
    nodeGroup.children.forEach((nodeMesh, index) => {
        const node = graphNodes[index];
        nodeMesh.position.set(node.x, node.y, node.z);

        // Add subtle pulsing effect
        const scale = 1 + Math.sin(Date.now() * 0.002 + index) * 0.05;
        nodeMesh.scale.set(scale, scale, scale);
    });

    // Update link positions
    linkGroup.children.forEach((line, index) => {
        const link = graphLinks[index];
        const source = graphNodes[link.source];
        const target = graphNodes[link.target];

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(source.x, source.y, source.z),
            new THREE.Vector3(target.x, target.y, target.z)
        ]);

        line.geometry.dispose();
        line.geometry = geometry;
    });

    // Auto-rotate camera
    if (autoRotate) {
        camera.position.x = Math.sin(Date.now() * 0.0005 * rotationSpeed) * 80;
        camera.position.z = Math.cos(Date.now() * 0.0005 * rotationSpeed) * 80;
        camera.lookAt(scene.position);
    }

    renderer.render(scene, camera);
}

// Apply force-directed layout physics
function applyForces() {
    // Repulsion
    const repulsion = 0.1;
    for (let i = 0; i < graphNodes.length; i++) {
        for (let j = i + 1; j < graphNodes.length; j++) {
            const nodeA = graphNodes[i];
            const nodeB = graphNodes[j];

            const dx = nodeA.x - nodeB.x;
            const dy = nodeA.y - nodeB.y;
            const dz = nodeA.z - nodeB.z;

            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const minDistance = nodeA.size + nodeB.size + 5;

            if (distance < minDistance) {
                const force = repulsion * (minDistance - distance) / distance;
                nodeA.vx += force * dx;
                nodeA.vy += force * dy;
                nodeA.vz += force * dz;
                nodeB.vx -= force * dx;
                nodeB.vy -= force * dy;
                nodeB.vz -= force * dz;
            }
        }
    }

    // Link attraction
    const attraction = 0.02;
    graphLinks.forEach(link => {
        const source = graphNodes[link.source];
        const target = graphNodes[link.target];

        const dx = source.x - target.x;
        const dy = source.y - target.y;
        const dz = source.z - target.z;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const targetDistance = 30 + link.strength * 20;

        const force = attraction * (distance - targetDistance) / distance;
        source.vx -= force * dx;
        source.vy -= force * dy;
        source.vz -= force * dz;
        target.vx += force * dx;
        target.vy += force * dy;
        target.vz += force * dz;
    });

    // Apply velocity and friction
    const friction = 0.85;
    graphNodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        node.vx *= friction;
        node.vy *= friction;
        node.vz *= friction;
    });
}

// Handle window resize
function onWindowResize() {
    camera.aspect = graphContainer.clientWidth / graphContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(graphContainer.clientWidth, graphContainer.clientHeight);
}

// Handle mouse move for hover effect
function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeGroup.children);

    if (intersects.length > 0) {
        const node = intersects[0].object.userData;
        showNodeInfo(node, event.clientX, event.clientY);
    } else {
        hideNodeInfo();
    }
}

// Handle mouse click for selection
function onMouseClick() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeGroup.children);

    if (intersects.length > 0) {
        const node = intersects[0].object.userData;
        selectedNode = node;

        // Create a highlight effect
        nodeGroup.children.forEach(child => {
            child.material.emissive.setHex(0x444444);
        });
        intersects[0].object.material.emissive.setHex(0xffff00);
    }
}

// Show node info
function showNodeInfo(node, x, y) {
    nodeInfo.style.display = 'block';
    nodeInfo.style.left = `${x + 15}px`;
    nodeInfo.style.top = `${y + 15}px`;
    nodeInfo.innerHTML = `
        <h3>${node.name}</h3>
        <p>Size: ${node.size.toFixed(1)}</p>
        <p>Connections: ${graphLinks.filter(l =>
            l.source === node.id || l.target === node.id).length}</p>
    `;
}

// Hide node info
function hideNodeInfo() {
    nodeInfo.style.display = 'none';
}

// Toggle VR mode
function toggleVRMode() {
    isVREnabled = !isVREnabled;
    vrIndicator.classList.toggle('active', isVREnabled);
    vrIndicator.querySelector('span').textContent =
        `Device Orientation: ${isVREnabled ? 'ON' : 'OFF'}`;

    if (isVREnabled) {
        autoRotate = false;
        window.addEventListener('deviceorientation', handleOrientation);
    } else {
        autoRotate = true;
        window.removeEventListener('deviceorientation', handleOrientation);
    }
}

// Handle device orientation for VR mode
function handleOrientation(event) {
    if (isVREnabled) {
        const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
        const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;

        camera.position.x = Math.sin(gamma) * 80;
        camera.position.y = Math.sin(beta) * 80;
        camera.position.z = Math.cos(gamma) * 80;

        camera.lookAt(scene.position);
    }
}

// Reset camera view
function resetCameraView() {
    camera.position.set(0, 0, 80);
    camera.lookAt(scene.position);
    autoRotate = true;

    if (isVREnabled) {
        toggleVRMode();
    }
}

// Take screenshot
function takeScreenshot() {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = '3d-mind-map.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event Listeners
processBtn.addEventListener('click', () => {
    generateGraph(documentInput.value);
});

sampleBtn.addEventListener('click', () => {
    documentInput.value = sampleText;
    generateGraph(sampleText);
});

infoBtn.addEventListener('click', () => {
    infoModal.classList.add('active');
});

closeModal.addEventListener('click', () => {
    infoModal.classList.remove('active');
});

toggleVR.addEventListener('click', toggleVRMode);
resetView.addEventListener('click', resetCameraView);
screenshotBtn.addEventListener('click', takeScreenshot);

// Slider events
document.getElementById('node-size').addEventListener('input', (e) => {
    const scale = parseFloat(e.target.value);
    nodeGroup.children.forEach((nodeMesh, index) => {
        const originalSize = graphNodes[index].size;
        nodeMesh.geometry.dispose();
        nodeMesh.geometry = new THREE.SphereGeometry(originalSize * scale, 16, 16);
    });
});

document.getElementById('link-distance').addEventListener('input', (e) => {
    // This would require rebuilding the force simulation with new parameters
    // For simplicity, we're just updating the target distance in applyForces
});

document.getElementById('rotation-speed').addEventListener('input', (e) => {
    rotationSpeed = parseFloat(e.target.value);
});

// Initialize the application
window.addEventListener('load', initThreeJS);
