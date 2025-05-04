# Patient Management PWA

A Progressive Web Application (PWA) for managing patients and consultations.

## Features

- Patient management (add, edit, delete)
- Patient search functionality
- Consultation tracking
- Offline capabilities
- Mobile-first responsive design
- Installable as a PWA

## Local Development

1. Clone the repository:
   ```
   git clone https://github.com/AzizGassara/Main_PWA.git
   cd Main_PWA/patient-management-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   node server.js
   ```

4. Open the application in your browser at `http://localhost:3000`

## Deploying to GitHub Pages

### Option 1: Manual Deployment

1. Prepare files for GitHub Pages:
   ```
   node deploy-to-gh-pages.js
   ```

2. Create a new branch for GitHub Pages:
   ```
   git checkout -b gh-pages
   ```

3. Add all files to the branch:
   ```
   git add .
   git commit -m "Deploy to GitHub Pages"
   ```

4. Push to GitHub:
   ```
   git push origin gh-pages
   ```

5. Go to your GitHub repository settings and enable GitHub Pages for the gh-pages branch.

### Option 2: GitHub Actions Workflow

1. Create a `.github/workflows` directory in your repository:
   ```
   mkdir -p .github/workflows
   ```

2. Create a workflow file `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v2

         - name: Setup Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '14'

         - name: Install dependencies
           run: npm install

         - name: Prepare for GitHub Pages
           run: node deploy-to-gh-pages.js

         - name: Deploy to GitHub Pages
           uses: JamesIves/github-pages-deploy-action@4.1.4
           with:
             branch: gh-pages
             folder: .
   ```

3. Push the changes to your repository:
   ```
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Actions workflow for deployment"
   git push origin main
   ```

4. GitHub Actions will automatically deploy your application to GitHub Pages.

## PWA Installation

Once deployed, users can install the PWA by:

1. Opening the application in a supported browser (Chrome, Edge, etc.)
2. Looking for the install prompt in the address bar or menu
3. Following the prompts to install the application

## License

MIT