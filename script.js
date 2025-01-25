const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Automation script system
let automationRunning = false;
let automationInterval;

// Array to hold all balls
let balls = [];

// Circle boundary configuration with start and end angles
let circleConfig = {
    count: 3, // Number of circles
    baseRadius: 200, // Radius of the innermost circle
    gap: 30, // Gap between circles
    borderWidth: 2, // Width of the circle's border
    borderColor: '#333', // Border color
    startAngle: 180, // Start angle in degrees
    endAngle: 165 // End angle in degrees
  };  

// Toggle for collision detection
let collisionsEnabled = true;

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
  }
  
  function getAngle(x, y) {
    return Math.atan2(y - canvas.height / 2, x - canvas.width / 2);
  }
  
// Resize canvas
function resizeCanvas() {
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.7;

  for (const ball of balls) {
    if (ball.x + ball.radius > canvas.width) ball.x = canvas.width - ball.radius;
    if (ball.y + ball.radius > canvas.height) ball.y = canvas.height - ball.radius;
  }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Spawn a new ball
function spawnBall(x, y) {
  const newBall = {
    id: balls.length + 1, // Assign unique ID based on the length of the balls array
    x: x || Math.random() * canvas.width, // Spawn at cursor if coordinates are provided
    y: y || Math.random() * canvas.height,
    radius: 20,
    dx: (Math.random() - 0.5) * 10, // Random horizontal speed
    dy: (Math.random() - 0.5) * 10, // Random vertical speed
    gravity: 0.1,
    elasticity: 0.8,
    useGravity: true,
    useElasticity: true,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    frozen: false, // Freeze state
  };
  balls.push(newBall);
}

// Handle ball updates with arc-based collision detection
function updateBall(ball) {
    if (ball.isDragging || ball.frozen) return; // If ball is frozen, skip updating
  
    if (ball.useGravity) {
      ball.dy += ball.gravity;
    }
  
    ball.x += ball.dx;
    ball.y += ball.dy;
  
    // Check collision with circular boundaries (only within arc)
    for (let i = circleConfig.count - 1; i >= 0; i--) {
      const circleRadius = circleConfig.baseRadius + i * circleConfig.gap;
      const dx = ball.x - canvas.width / 2;
      const dy = ball.y - canvas.height / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate the angle of the ball's position relative to the center
      let ballAngle = Math.atan2(dy, dx);
      
      // Normalize angle to be in the range [0, 2 * Math.PI]
      if (ballAngle < 0) {
        ballAngle += 2 * Math.PI;  // Wrap negative angles to positive
      }
      
      // Convert start and end angles to radians
      const startAngle = degToRad(circleConfig.startAngle);
      const endAngle = degToRad(circleConfig.endAngle);
      
      // Ensure endAngle is greater than startAngle (handle wraparound if necessary)
      if (endAngle < startAngle) {
        if (ballAngle >= startAngle || ballAngle <= endAngle) {
          // Ball is within arc if the angle is either in the range above or below 0
        } else {
          continue; // Ball is outside arc
        }
      } else {
        if (ballAngle >= startAngle && ballAngle <= endAngle) {
          // Ball is within arc range
        } else {
          continue; // Ball is outside arc
        }
      }
  
      // Handle collision: If the ball is within the arc and collides with the circle
      if (distance + ball.radius > circleRadius) {
        // Reflect the ball's velocity against the circle
        const angle = Math.atan2(dy, dx);
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
  
        const velocityDotNormal = ball.dx * normalX + ball.dy * normalY;
        ball.dx -= 2 * velocityDotNormal * normalX;
        ball.dy -= 2 * velocityDotNormal * normalY;
  
        // Reposition the ball outside of the circle to prevent it from sticking
        const overlap = distance + ball.radius - circleRadius;
        ball.x -= overlap * normalX;
        ball.y -= overlap * normalY;
        break; // Stop after the first collision within the arc
      }
    }
  
    // Handle wall collisions
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
      ball.dx = -ball.dx;
      ball.x = ball.x - ball.radius < 0 ? ball.radius : canvas.width - ball.radius;
    }
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
      ball.dy = -ball.dy * (ball.useElasticity ? ball.elasticity : 1);
      ball.y = ball.y - ball.radius < 0 ? ball.radius : canvas.height - ball.radius;
    }
  }

// Handle ball-to-ball collisions
function handleBallCollisions() {
  if (!collisionsEnabled) return;

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const ball1 = balls[i];
      const ball2 = balls[j];

      // Skip collision checks if both balls are frozen
      if (ball1.frozen && ball2.frozen) continue;

      // Calculate the distance between the centers of the balls
      const dx = ball2.x - ball1.x;
      const dy = ball2.y - ball1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if the balls are overlapping
      if (distance < ball1.radius + ball2.radius) {
        // Calculate the angle of the collision
        const angle = Math.atan2(dy, dx);

        // Calculate the normal and tangent vectors
        const normalX = dx / distance;
        const normalY = dy / distance;
        const tangentX = -normalY;
        const tangentY = normalX;

        // Calculate the velocity components along the normal and tangent directions
        const dotProduct1 = ball1.dx * normalX + ball1.dy * normalY;
        const dotProduct2 = ball2.dx * normalX + ball2.dy * normalY;

        // Update the velocities using the conservation of momentum
        const newDx1 = ball1.dx - 2 * dotProduct1 * normalX;
        const newDy1 = ball1.dy - 2 * dotProduct1 * normalY;
        const newDx2 = ball2.dx - 2 * dotProduct2 * normalX;
        const newDy2 = ball2.dy - 2 * dotProduct2 * normalY;

        // Update ball velocities (only if not frozen)
        if (!ball1.frozen) {
          ball1.dx = newDx1;
          ball1.dy = newDy1;
        }
        if (!ball2.frozen) {
          ball2.dx = newDx2;
          ball2.dy = newDy2;
        }

        // Reposition balls to prevent overlap
        const overlap = ball1.radius + ball2.radius - distance;
        const overlapX = overlap * normalX / 2;
        const overlapY = overlap * normalY / 2;

        // Reposition balls based on the overlap distance
        ball1.x -= overlapX;
        ball1.y -= overlapY;
        ball2.x += overlapX;
        ball2.y += overlapY;
      }
    }
  }
}

// Draw circle boundaries with start and end angles in degrees
function drawCircleBoundary() {
    for (let i = 0; i < circleConfig.count; i++) {
      const radius = circleConfig.baseRadius + i * circleConfig.gap;
      
      // Convert start and end angles from degrees to radians
      const startAngle = degToRad(circleConfig.startAngle);
      const endAngle = degToRad(circleConfig.endAngle);
  
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, startAngle, endAngle);
  
      ctx.strokeStyle = circleConfig.borderColor;
      ctx.lineWidth = circleConfig.borderWidth;
      ctx.stroke();
      ctx.closePath();
    }
  }  

// Draw a ball with an outline
function drawBall(ball) {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#0095DD';
  ctx.fill();
  ctx.lineWidth = 2; // Outline width
  ctx.strokeStyle = '#000'; // Outline color
  ctx.stroke();
  ctx.closePath();
}

// Animation loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCircleBoundary();
  for (const ball of balls) {
    drawBall(ball);
    updateBall(ball);
  }
  handleBallCollisions(); // Handle collisions between balls if enabled
  requestAnimationFrame(draw);
}

// Dragging functionality
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (const ball of balls) {
    const dx = mouseX - ball.x;
    const dy = mouseY - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= ball.radius) {
      ball.isDragging = true;
      ball.dragOffsetX = dx;
      ball.dragOffsetY = dy;
      break;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  for (const ball of balls) {
    if (ball.isDragging) {
      const rect = canvas.getBoundingClientRect();
      ball.x = e.clientX - rect.left - ball.dragOffsetX;
      ball.y = e.clientY - rect.top - ball.dragOffsetY;
    }
  }
});

canvas.addEventListener('mouseup', () => {
  for (const ball of balls) {
    ball.isDragging = false;
  }
});

// Add key listener to spawn balls
document.addEventListener('keydown', (e) => {
  if (e.key === 'e') {
    const rect = canvas.getBoundingClientRect();
    const mouseX = canvas.width / 2;
    const mouseY = canvas.height / 2;
    spawnBall(mouseX, mouseY);
  }
});

// Press 'R' to delete all balls
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    balls = []; // Remove all balls
  }
});

// Freeze ball when 'Q' is pressed
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (const ball of balls) {
    const dx = mouseX - ball.x;
    const dy = mouseY - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= ball.radius) {
      // Toggle the frozen state of the ball when it's clicked
      ball.frozen = !ball.frozen;
      break;
    }
  }
});

// Speed adjustment
function updateSpeed(value) {
  const speed = parseFloat(value);
  for (const ball of balls) {
    const angle = Math.atan2(ball.dy, ball.dx);

    ball.dx = speed * Math.cos(angle);
    ball.dy = speed * Math.sin(angle);
  }
}

// Update circle configuration dynamically
function updateCircleConfig() {
  circleConfig.count = parseInt(document.getElementById('circleCount').value);
  circleConfig.gap = parseInt(document.getElementById('circleGap').value);
  circleConfig.borderWidth = parseInt(document.getElementById('circleBorderWidth').value);
  circleConfig.borderColor = document.getElementById('circleBorderColor').value;
  circleConfig.startAngle = parseFloat(document.getElementById('circleStartAngle').value);
  circleConfig.endAngle = parseFloat(document.getElementById('circleEndAngle').value);
}

// Parse and execute the custom script
function executeScript(script) {
    const lines = script.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
    let i = 0;
    const loopStack = []; // Stack to manage nested loops
  
    function processLine() {
      if (i >= lines.length || !automationRunning) {
        automationRunning = false;
        clearInterval(automationInterval);
        return;
      }
  
      const line = lines[i++].trim();
      const parts = line.split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);
  
      switch (command) {
        case 'spawn':
        const mouseX = canvas.width / 2;
        const mouseY = canvas.height / 2;
          spawnBall(mouseX, mouseY);
          console.log(`Spawned ball at center.`)
          break;
          case 'clear':
            count = balls.length
            balls = []; // Remove all balls
            console.log(`Cleared all balls (${count}).`)
            break;
        case 'freeze':
          const freezeId = args[0];
          if (freezeId === '*') {
            for (const ball of balls) {
              ball.frozen = true;
              console.log(`All balls frozen.`)
            }
          } else if (freezeId === 'new') {
            const lastBall = balls[balls.length - 1];
            if (lastBall) lastBall.frozen = true;
            console.log(`Newest ball (${lastBall}) frozen.`)
          } else {
            const ballToFreeze = balls.find(b => b.id === parseInt(freezeId));
            if (ballToFreeze) ballToFreeze.frozen = true;
            console.log(`Ball ${ballToFreeze} frozen.`)
          }
          break;
        case 'unfreeze':
          const unfreezeId = args[0];
          if (unfreezeId === '*') {
            for (const ball of balls) {
              ball.frozen = false;
              console.log(`All balls unfrozen.`)
            }
          } else {
            const ballToUnfreeze = balls.find(b => b.id === parseInt(unfreezeId));
            if (ballToUnfreeze) ballToUnfreeze.frozen = false;
            console.log(`Ball ${ballToUnfreeze} unfrozen.`)
          }
          break;
        case 'loop':
          const loopCount = parseInt(args[0]);
          loopStack.push({ count: loopCount, index: i });
          break;
        case 'endloop':
          if (loopStack.length > 0) {
            const loop = loopStack[loopStack.length - 1];
            if (loop.count > 1) {
              loop.count--;
              i = loop.index;
            } else {
              loopStack.pop();
            }
          }
          break;
          case 'speed':
          const speed = args[0];
          updateSpeed(speed)
          console.log(`Speed changed to ${speed}`)
          return;
        case 'wait':
          const waitTime = parseInt(args[0]);
          console.log(`Wait for ${waitTime} ms, or ${(waitTime / 1000)} seconds.`)
          setTimeout(processLine, waitTime); // Pause for the specified amount of time
          return; // Exit this iteration to wait for the timeout before continuing
        default:
          console.warn(`Unknown command: ${command}`);
          break;
      }
  
      if (loopStack.length > 0) {
        setTimeout(processLine, 100); // Delay before processing the next loop iteration
      } else {
        processLine(); // Continue to next line immediately
      }
    }
  
    automationRunning = true;
    processLine();
  }  

// Control buttons and event listeners
document.getElementById('startButton').addEventListener('click', function () {
    const script = document.getElementById('scriptInput').value;
    console.log(`Script started.`)
    executeScript(script);
  });
  
  document.getElementById('stopButton').addEventListener('click', function () {
    automationRunning = false;
    console.log(`Script stopped.`)
  });

  // Event listeners for input changes
document.getElementById('circleStartAngle').addEventListener('input', function(event) {
    circleConfig.startAngle = parseFloat(event.target.value); // Update start angle
  });
  
  document.getElementById('circleEndAngle').addEventListener('input', function(event) {
    circleConfig.endAngle = parseFloat(event.target.value); // Update end angle
  });

draw();
