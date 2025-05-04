const fs = require('fs');
const path = require('path');

// Function to modify paths for GitHub Pages
function modifyForGitHubPages() {
  console.log('Preparing files for GitHub Pages deployment...');
  
  // 1. Update manifest.json
  const manifestPath = path.join(__dirname, 'manifest.json');
  let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Update start_url to include repository name
  manifest.start_url = './';
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Updated manifest.json');
  
  // 2. Update service worker
  const swPath = path.join(__dirname, 'service-worker.js');
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  // Update cache paths
  swContent = swContent.replace("const urlsToCache = [", 
    "const urlsToCache = [\n  './',");
  
  fs.writeFileSync(swPath, swContent);
  console.log('Updated service-worker.js');
  
  // 3. Update service worker registration in index.html
  const indexPath = path.join(__dirname, 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Update service worker path
  indexContent = indexContent.replace(
    "navigator.serviceWorker.register('/service-worker.js')",
    "navigator.serviceWorker.register('./service-worker.js')"
  );
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('Updated index.html');
  
  console.log('Files prepared for GitHub Pages deployment!');
}

// Run the modifications
modifyForGitHubPages();