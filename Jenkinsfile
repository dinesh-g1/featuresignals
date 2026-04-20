pipeline {
    agent none

    options {
        buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
        disableConcurrentBuilds()
        timestamps()
    }

    environment {
        // Docker registry credentials
        DOCKER_REGISTRY = credentials('docker-registry')

        // Test environment
        TEST_DATABASE_URL = 'postgresql://fs:fsdev@postgres:5432/featuresignals'

        // Build artifacts directory
        ARTIFACTS_DIR = "${WORKSPACE}/artifacts"

        // Version and tag
        VERSION = "${env.BUILD_NUMBER}"
        DOCKER_TAG = "${env.BITBUCKET_BRANCH ?: 'latest'}-${VERSION}"
    }

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['none', 'staging', 'production'], description: 'Deployment environment')
        booleanParam(name: 'SKIP_SDK_TESTS', defaultValue: false, description: 'Skip SDK tests for faster feedback')
        booleanParam(name: 'SKIP_SECURITY_SCAN', defaultValue: false, description: 'Skip dependency security scans')
    }

    stages {
        stage('Prepare') {
            agent {
                docker {
                    image 'node:22-alpine'
                    args '-u root'
                    reuseNode true
                }
            }
            steps {
                sh '''
                    echo "Starting build #${BUILD_NUMBER}"
                    echo "Branch: ${env.BITBUCKET_BRANCH ?: env.GIT_BRANCH}"
                    echo "Commit: ${env.GIT_COMMIT}"
                    echo "Build URL: ${env.BUILD_URL}"

                    mkdir -p ${ARTIFACTS_DIR}

                    # Detect changed files
                    if [ -n "${env.GIT_PREVIOUS_SUCCESSFUL_COMMIT}" ]; then
                        CHANGED_FILES=$(git diff --name-only ${env.GIT_PREVIOUS_SUCCESSFUL_COMMIT} ${env.GIT_COMMIT})
                        echo "Changed files since last successful build:"
                        echo "${CHANGED_FILES}"

                        # Set environment variables for change detection
                        echo "SERVER_CHANGED=$(echo "${CHANGED_FILES}" | grep -q '^server/' && echo 'true' || echo 'false')" > ${ARTIFACTS_DIR}/changed.env
                        echo "DASHBOARD_CHANGED=$(echo "${CHANGED_FILES}" | grep -q '^dashboard/' && echo 'true' || echo 'false')" >> ${ARTIFACTS_DIR}/changed.env
                        echo "OPS_CHANGED=$(echo "${CHANGED_FILES}" | grep -q '^ops/' && echo 'true' || echo 'false')" >> ${ARTIFACTS_DIR}/changed.env
                        echo "WEBSITE_CHANGED=$(echo "${CHANGED_FILES}" | grep -q '^website/' && echo 'true' || echo 'false')" >> ${ARTIFACTS_DIR}/changed.env
                        echo "SDKS_CHANGED=$(echo "${CHANGED_FILES}" | grep -q '^sdks/' && echo 'true' || echo 'false')" >> ${ARTIFACTS_DIR}/changed.env
                    else
                        # First build or no previous commit, run everything
                        echo "SERVER_CHANGED=true" > ${ARTIFACTS_DIR}/changed.env
                        echo "DASHBOARD_CHANGED=true" >> ${ARTIFACTS_DIR}/changed.env
                        echo "OPS_CHANGED=true" >> ${ARTIFACTS_DIR}/changed.env
                        echo "WEBSITE_CHANGED=true" >> ${ARTIFACTS_DIR}/changed.env
                        echo "SDKS_CHANGED=true" >> ${ARTIFACTS_DIR}/changed.env
                    fi

                    # Load change detection
                    source ${ARTIFACTS_DIR}/changed.env

                    echo "=== Change Detection ==="
                    echo "Server changed: ${SERVER_CHANGED}"
                    echo "Dashboard changed: ${DASHBOARD_CHANGED}"
                    echo "Ops changed: ${OPS_CHANGED}"
                    echo "Website changed: ${WEBSITE_CHANGED}"
                    echo "SDKs changed: ${SDKS_CHANGED}"
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: "${ARTIFACTS_DIR}/changed.env", fingerprint: true
                }
            }
        }

        stage('Build & Test') {
            parallel {
                stage('Server') {
                    when {
                        environment name: 'SERVER_CHANGED', value: 'true'
                    }
                    agent {
                        docker {
                            image 'golang:1.25-alpine'
                            args '-u root'
                            reuseNode true
                        }
                    }
                    environment {
                        GOFLAGS = '-mod=readonly'
                    }
                    steps {
                        sh '''
                            echo "=== Server Build & Test ==="

                            # Install migrate tool
                            go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

                            # Panic check - enterprise quality gate
                            echo "Checking for panic() calls in production code..."
                            if grep -r "panic(" --include="*.go" --exclude="*_test.go" server/; then
                                echo "ERROR: Found panic() calls in production code. Use proper error handling instead."
                                exit 1
                            fi
                            echo "✓ No panic() calls found."

                            # Run tests with coverage
                            cd server
                            go test ./... -count=1 -timeout 120s -v -coverprofile=coverage.out -covermode=atomic

                            # Generate coverage report
                            go tool cover -func=coverage.out -o ${ARTIFACTS_DIR}/server-coverage.txt
                            go tool cover -html=coverage.out -o ${ARTIFACTS_DIR}/server-coverage.html

                            # Vet and lint
                            go vet ./...

                            # Build binaries
                            go build -o ${ARTIFACTS_DIR}/featuresignals-server ./cmd/server
                            go build -o ${ARTIFACTS_DIR}/featuresignals-relay ./cmd/relay
                            go build -o ${ARTIFACTS_DIR}/featuresignals-stalescan ./cmd/stalescan
                        '''
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: "${ARTIFACTS_DIR}/featuresignals-server,${ARTIFACTS_DIR}/featuresignals-relay,${ARTIFACTS_DIR}/featuresignals-stalescan", fingerprint: true
                            publishHTML(target: [
                                reportDir: 'server',
                                reportFiles: 'coverage.html',
                                reportName: 'Server Coverage'
                            ])
                        }
                    }
                }

                stage('Dashboard') {
                    when {
                        environment name: 'DASHBOARD_CHANGED', value: 'true'
                    }
                    agent {
                        docker {
                            image 'node:22-alpine'
                            args '-u root'
                            reuseNode true
                        }
                    }
                    steps {
                        sh '''
                            echo "=== Dashboard Build & Test ==="

                            # TypeScript quality gates
                            echo "Checking for console.log and any types in TypeScript code..."
                            if grep -r "console\\.log" --include="*.ts" --include="*.tsx" dashboard/src/; then
                                echo "ERROR: Found console.log in committed code. Use structured logging instead."
                                exit 1
                            fi

                            if grep -r ": any\\b" --include="*.ts" --include="*.tsx" dashboard/src/; then
                                echo "ERROR: Found 'any' types in TypeScript code. Use proper interfaces or unknown with type guards."
                                exit 1
                            fi
                            echo "✓ No console.log or any types found."

                            # Install dependencies
                            cd dashboard
                            npm ci

                            # Run tests
                            npm run test:coverage

                            # Build
                            NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build

                            # Create artifact
                            tar -czf ${ARTIFACTS_DIR}/dashboard-build.tar.gz .next/ public/ package.json
                        '''
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: "${ARTIFACTS_DIR}/dashboard-build.tar.gz", fingerprint: true
                        }
                    }
                }

                stage('Ops Portal') {
                    when {
                        environment name: 'OPS_CHANGED', value: 'true'
                    }
                    agent {
                        docker {
                            image 'node:22-alpine'
                            args '-u root'
                            reuseNode true
                        }
                    }
                    steps {
                        sh '''
                            echo "=== Ops Portal Build & Test ==="

                            # TypeScript quality gates
                            echo "Checking for console.log and any types in TypeScript code..."
                            if grep -r "console\\.log" --include="*.ts" --include="*.tsx" ops/src/; then
                                echo "ERROR: Found console.log in committed code. Use structured logging instead."
                                exit 1
                            fi

                            if grep -r ": any\\b" --include="*.ts" --include="*.tsx" ops/src/; then
                                echo "ERROR: Found 'any' types in TypeScript code. Use proper interfaces or unknown with type guards."
                                exit 1
                            fi
                            echo "✓ No console.log or any types found."

                            # Install dependencies
                            cd ops
                            npm ci

                            # Lint
                            npm run lint --if-present

                            # Build
                            NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build

                            # Create artifact
                            tar -czf ${ARTIFACTS_DIR}/ops-build.tar.gz .next/ public/ package.json
                        '''
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: "${ARTIFACTS_DIR}/ops-build.tar.gz", fingerprint: true
                        }
                    }
                }

                stage('SDKs') {
                    when {
                        allOf {
                            environment name: 'SDKS_CHANGED', value: 'true'
                            expression { return params.SKIP_SDK_TESTS == false }
                        }
                    }
                    parallel {
                        stage('Go SDK') {
                            agent {
                                docker {
                                    image 'golang:1.25-alpine'
                                    args '-u root'
                                    reuseNode true
                                }
                            }
                            steps {
                                sh '''
                                    echo "=== Go SDK Build & Test ==="

                                    # Panic check
                                    echo "Checking for panic() calls in SDK production code..."
                                    if grep -r "panic(" --include="*.go" --exclude="*_test.go" sdks/go/; then
                                        echo "ERROR: Found panic() calls in SDK production code. Use proper error handling instead."
                                        exit 1
                                    fi
                                    echo "✓ No panic() calls found in SDK."

                                    cd sdks/go
                                    go test ./... -count=1 -v -coverprofile=coverage.out -covermode=atomic
                                    go tool cover -func=coverage.out -o ${ARTIFACTS_DIR}/go-sdk-coverage.txt

                                    # Build SDK
                                    go build -o ${ARTIFACTS_DIR}/featuresignals-go-sdk ./...
                                '''
                            }
                            post {
                                always {
                                    archiveArtifacts artifacts: "${ARTIFACTS_DIR}/featuresignals-go-sdk", fingerprint: true
                                }
                            }
                        }

                        stage('Node.js SDK') {
                            agent {
                                docker {
                                    image 'node:22-alpine'
                                    args '-u root'
                                    reuseNode true
                                }
                            }
                            steps {
                                sh '''
                                    echo "=== Node.js SDK Build & Test ==="

                                    # TypeScript quality gates
                                    echo "Checking for console.log and any types in SDK TypeScript code..."
                                    if grep -r "console\\.log" --include="*.ts" sdks/node/src/; then
                                        echo "ERROR: Found console.log in committed SDK code. Use structured logging instead."
                                        exit 1
                                    fi

                                    if grep -r ": any\\b" --include="*.ts" sdks/node/src/; then
                                        echo "ERROR: Found 'any' types in SDK TypeScript code. Use proper interfaces or unknown with type guards."
                                        exit 1
                                    fi
                                    echo "✓ No console.log or any types found in SDK."

                                    cd sdks/node
                                    npm install
                                    npm test --if-present

                                    # Build
                                    npm run build --if-present

                                    # Create package artifact
                                    tar -czf ${ARTIFACTS_DIR}/node-sdk.tar.gz dist/ package.json README.md
                                '''
                            }
                            post {
                                always {
                                    archiveArtifacts artifacts: "${ARTIFACTS_DIR}/node-sdk.tar.gz", fingerprint: true
                                }
                            }
                        }

                        stage('Python SDK') {
                            agent {
                                docker {
                                    image 'python:3.12-alpine'
                                    args '-u root'
                                    reuseNode true
                                }
                            }
                            steps {
                                sh '''
                                    echo "=== Python SDK Build & Test ==="
                                    cd sdks/python
                                    pip install -e ".[dev]" pytest-cov
                                    python -m pytest tests/ -v --cov=featuresignals --cov-report=term-missing --cov-report=html:${ARTIFACTS_DIR}/python-coverage

                                    # Build package
                                    python setup.py sdist bdist_wheel
                                    cp dist/* ${ARTIFACTS_DIR}/
                                '''
                            }
                            post {
                                always {
                                    archiveArtifacts artifacts: "${ARTIFACTS_DIR}/*.whl,${ARTIFACTS_DIR}/*.tar.gz", fingerprint: true
                                }
                            }
                        }

                        stage('Java SDK') {
                            agent {
                                docker {
                                    image 'maven:3.9-eclipse-temurin-17-alpine'
                                    args '-u root'
                                    reuseNode true
                                }
                            }
                            steps {
                                sh '''
                                    echo "=== Java SDK Build & Test ==="
                                    cd sdks/java
                                    mvn -B clean package
                                    cp target/*.jar ${ARTIFACTS_DIR}/
                                '''
                            }
                            post {
                                always {
                                    archiveArtifacts artifacts: "${ARTIFACTS_DIR}/*.jar", fingerprint: true
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Security Scan') {
            when {
                allOf {
                    expression { return params.SKIP_SECURITY_SCAN == false }
                    any {
                        environment name: 'SERVER_CHANGED', value: 'true'
                        environment name: 'DASHBOARD_CHANGED', value: 'true'
                        environment name: 'OPS_CHANGED', value: 'true'
                        environment name: 'SDKS_CHANGED', value: 'true'
                    }
                }
            }
            parallel {
                stage('Go Security') {
                    when {
                        environment name: 'SERVER_CHANGED', value: 'true'
                    }
                    agent {
                        docker {
                            image 'golang:1.25-alpine'
                            args '-u root'
                            reuseNode true
                        }
                    }
                    steps {
                        sh '''
                            echo "=== Go Security Scan ==="

                            # Install govulncheck
                            go install golang.org/x/vuln/cmd/govulncheck@latest

                            # Scan server
                            cd server
                            govulncheck ./...

                            # Scan Go SDK
                            cd ../sdks/go
                            govulncheck ./...
                        '''
                    }
                }

                stage('Node.js Security') {
                    when {
                        any {
                            environment name: 'DASHBOARD_CHANGED', value: 'true'
                            environment name: 'OPS_CHANGED', value: 'true'
                            environment name: 'SDKS_CHANGED', value: 'true'
                        }
                    }
                    agent {
                        docker {
                            image 'node:22-alpine'
                            args '-u root'
                            reuseNode true
                        }
                    }
                    steps {
                        sh '''
                            echo "=== Node.js Security Scan ==="

                            # Dashboard
                            if [ "${DASHBOARD_CHANGED}" = "true" ]; then
                                echo "Scanning dashboard..."
                                cd dashboard
                                npm audit --audit-level=high || true
                            fi

                            # Ops portal
                            if [ "${OPS_CHANGED}" = "true" ]; then
                                echo "Scanning ops portal..."
                                cd ../ops
                                npm audit --audit-level=high || true
                            fi

                            # Node SDK
                            if [ "${SDKS_CHANGED}" = "true" ]; then
                                echo "Scanning Node.js SDK..."
                                cd ../sdks/node
                                npm audit --audit-level=high || true
                            fi
                        '''
                    }
                }
            }
        }

        stage('Build Docker Images') {
            when {
                any {
                    branch 'main'
                    branch 'develop'
                    branch pattern: 'release/.*', comparator: 'REGEXP'
                }
            }
            agent {
                docker {
                    image 'docker:24-cli'
                    args '-u root -v /var/run/docker.sock:/var/run/docker.sock'
                    reuseNode true
                }
            }
            steps {
                sh '''
                    echo "=== Building Docker Images ==="

                    # Login to Docker registry
                    echo "${DOCKER_REGISTRY_PSW}" | docker login -u "${DOCKER_REGISTRY_USR}" --password-stdin

                    # Build server image
                    docker build \
                        -t featuresignals/server:${DOCKER_TAG} \
                        -t featuresignals/server:latest \
                        -f server/Dockerfile \
                        server/

                    # Build dashboard image
                    docker build \
                        -t featuresignals/dashboard:${DOCKER_TAG} \
                        -t featuresignals/dashboard:latest \
                        -f dashboard/Dockerfile \
                        dashboard/

                    # Build ops portal image
                    docker build \
                        -t featuresignals/ops:${DOCKER_TAG} \
                        -t featuresignals/ops:latest \
                        -f ops/Dockerfile \
                        ops/

                    # Push images
                    docker push featuresignals/server:${DOCKER_TAG}
                    docker push featuresignals/server:latest
                    docker push featuresignals/dashboard:${DOCKER_TAG}
                    docker push featuresignals/dashboard:latest
                    docker push featuresignals/ops:${DOCKER_TAG}
                    docker push featuresignals/ops:latest
                '''
            }
            post {
                always {
                    sh 'docker logout'
                }
            }
        }

        stage('Deploy') {
            when {
                allOf {
                    any {
                        branch 'main'
                        branch 'develop'
                        branch pattern: 'release/.*', comparator: 'REGEXP'
                    }
                    expression { return params.DEPLOY_ENV != 'none' }
                }
            }
            agent any
            steps {
                script {
                    if (params.DEPLOY_ENV == 'staging') {
                        sh '''
                            echo "Deploying to staging environment..."
                            # Add your staging deployment commands here
                            # Example: kubectl apply -f deploy/k8s/staging/
                        '''
                    } else if (params.DEPLOY_ENV == 'production') {
                        input message: "Deploy to production?", ok: "Confirm"
                        sh '''
                            echo "Deploying to production environment..."
                            # Add your production deployment commands here
                            # Example: kubectl apply -f deploy/k8s/production/
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // Summary of build results
                def summary = """
                ===== BUILD SUMMARY =====
                Build: ${env.BUILD_NUMBER}
                Status: ${currentBuild.currentResult}
                Duration: ${currentBuild.durationString}
                Changes: ${env.SERVER_CHANGED ? 'Server ' : ''}${env.DASHBOARD_CHANGED ? 'Dashboard ' : ''}${env.OPS_CHANGED ? 'Ops ' : ''}${env.SDKS_CHANGED ? 'SDKs ' : ''}
                =========================
                """
                echo summary

                // Archive all artifacts
                archiveArtifacts artifacts: "${ARTIFACTS_DIR}/**", fingerprint: true
            }
        }
        success {
            emailext (
                subject: "Build Success: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "The build completed successfully.\n\nBuild URL: ${env.BUILD_URL}",
                to: 'engineering@featuresignals.com'
            )
        }
        failure {
            emailext (
                subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "The build failed. Please check the logs.\n\nBuild URL: ${env.BUILD_URL}",
                to: 'engineering@featuresignals.com',
                attachLog: true
            )
        }
        unstable {
            emailext (
                subject: "Build Unstable: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "The build is unstable (tests failed).\n\nBuild URL: ${env.BUILD_URL}",
                to: 'engineering@featuresignals.com'
            )
        }
    }
}
