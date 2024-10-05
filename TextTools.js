const WORDS = [
    ["enigma", "danger", "crypt", "shadow", "riddle", "puzzle", "vault", "secret", "quest", "cloak"],
    ['']
];
export default class Tools {
    static async encodeNum(n, type){
        return (n + '').split('').map(n=>WORDS[type][parseInt(n)]).join('-');
    }
    static async decodeNum(n, type){
        const parts = n.split('-').map(n=>WORDS[type].indexOf(n));
        if(parts.find(n=>n<0)) return NaN;
        return parseInt(parts.join(''));
    }

    static addTextToCubeFace(wall, title, text, targetPoint, rectangleWidth, THREE) {
        // Create the canvas and draw the text (same as before)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const aspectRatio = 2;
        const canvasWidth = 512;
        const canvasHeight = canvasWidth / aspectRatio;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    
        // Draw the rounded rectangle
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 5;
        const radius = 20;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(canvas.width - radius, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
        ctx.lineTo(canvas.width, canvas.height - radius);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
        ctx.lineTo(radius, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    
        // Add title and text
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        const SIZES = [24*3, 16*3];
        ctx.font = SIZES[0]+'px Arial';
        ctx.fillText(title, canvas.width / 2, canvas.height / 2 + SIZES[0]/1.5);
        ctx.font = SIZES[1]+'px Arial';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 - SIZES[0]/4 );
    
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    
        // Get wall dimensions
        const wallWidth = wall.geometry.parameters.width;
        const wallHeight = wall.geometry.parameters.height;
        const wallDepth = wall.geometry.parameters.depth;
    
        const halfWidth = wallWidth / 2;
        const halfHeight = wallHeight / 2;
        const halfDepth = wallDepth / 2;
    
        // Define face positions and rotations
        const faceCenterPositions = [
            { position: new THREE.Vector3(0, 0, halfDepth), rotation: [0, 0, 0] },                      // Front
            { position: new THREE.Vector3(0, 0, -halfDepth), rotation: [0, Math.PI, 0] },               // Back
            { position: new THREE.Vector3(halfWidth, 0, 0), rotation: [0, Math.PI / 2, 0] },            // Right
            { position: new THREE.Vector3(-halfWidth, 0, 0), rotation: [0, -Math.PI / 2, 0] },          // Left
            { position: new THREE.Vector3(0, halfHeight, 0), rotation: [-Math.PI / 2, 0, 0] },          // Top
            { position: new THREE.Vector3(0, -halfHeight, 0), rotation: [Math.PI / 2, 0, 0] }           // Bottom
        ];
    
        // Find the nearest face to the target point
        let closestFace = null;
        let minDistance = Infinity;
    
        faceCenterPositions.forEach(face => {
            const faceWorldPosition = face.position.clone().applyMatrix4(wall.matrixWorld);
            const distance = faceWorldPosition.distanceTo(targetPoint);
            if (distance < minDistance) {
                minDistance = distance;
                closestFace = face;
            }
        });
    
        // Create the plane geometry for the text mesh
        const planeGeometry = new THREE.PlaneGeometry(rectangleWidth, rectangleWidth / aspectRatio);
        const textMesh = new THREE.Mesh(planeGeometry, material);
    
        // Set the rotation
        textMesh.rotation.set(...closestFace.rotation);
    
        // Position the text mesh at the center of the face
        textMesh.position.copy(closestFace.position);
    
        // Offset the text mesh slightly along the face normal
        const faceNormal = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(...closestFace.rotation));
        const offset = 0.01;  // Adjust if necessary
        textMesh.position.add(faceNormal.multiplyScalar(offset));
    
        // Add the text mesh to the wall mesh
        wall.add(textMesh);
    }    
}