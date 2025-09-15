# JurisAgentis Legal Practice Management System

A comprehensive legal practice management platform built using GitHub's Spec-Kit methodology with spec-driven development.

## 🏗️ Project Structure

This is a **Spec-Kit project** that follows spec-driven development methodology:

```
JurisAgentis/
├── JurisAgentis/specs/          # Feature specifications
│   ├── 001-core-legal-practice/ # Core legal practice management
│   ├── 002-enhanced-user-auth/  # Authentication & user management  
│   └── 003-client-management/   # Client relationship management
├── spec-kit/                    # Spec-Kit framework
├── jurisagentis-app/           # Main application code
│   ├── app/                    # Next.js 15 application
│   ├── lib/                    # Shared libraries
│   ├── types/                  # TypeScript definitions
│   ├── supabase/              # Database migrations
│   └── tests/                 # Comprehensive test suite
└── README.md                   # This file
```

## 🚀 Quick Start for Developers

### Option 1: Local Development (Recommended)
```bash
# Navigate to the application directory
cd jurisagentis-app

# Install dependencies
npm install

# Start development server
npm run dev

# Opens at http://localhost:3000
```

### Option 2: Docker Development
```bash
# Navigate to the application directory
cd jurisagentis-app

# Build and run with Docker Compose
docker-compose up --build
```

## ✨ What's Implemented

### ✅ **Core Systems Complete:**
- **Authentication System** - JWT, MFA, role-based access control
- **Client Management** - Comprehensive client relationship management
- **Matter Management** - Legal case/matter lifecycle management
- **User Interface** - Professional React/Next.js frontend

### 🔧 **Technical Stack:**
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with comprehensive validation
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with custom middleware
- **Testing**: Jest with contract and integration tests

### 📊 **Key Features:**
- Role-based access control (6-tier hierarchy)
- Multi-factor authentication (TOTP)
- Comprehensive audit logging
- Mock data fallback for development
- Professional UI/UX with responsive design

## 🎯 **Current Status:**

✅ **Production Ready:**
- Core authentication system
- Client management system  
- Matter management system
- Professional user interface

🚧 **In Development:**
- Document management system
- Billing system
- Calendar & deadline management
- Workflow automation

## 📖 **Spec-Driven Development**

This project was built using [GitHub's Spec-Kit](https://github.com/github/spec-kit) methodology:

1. **Specifications First** - Each feature starts with detailed functional specs
2. **Technical Planning** - Architecture and implementation plans
3. **Contract Testing** - API contracts validated before implementation
4. **Iterative Development** - Systematic feature-by-feature implementation

## 🛠️ **Development Environment**

The application includes:
- Comprehensive TypeScript definitions
- Contract tests for all API endpoints
- Mock data for offline development
- Professional error handling
- Responsive design system

## 📋 **Available Commands**

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test            # Run all tests
npm run test:contract   # Run contract tests
npm run test:integration # Run integration tests

# Linting
npm run lint            # Check code quality
```

## 🤝 **Contributing**

This project follows spec-driven development. To add new features:

1. Create a specification in `JurisAgentis/specs/`
2. Define technical implementation plan
3. Write contract tests
4. Implement the feature
5. Validate against specifications

## 📞 **Support**

For questions about the implementation or to contribute to the project, please review the specifications in the `specs/` directory which contain detailed functional requirements and technical implementation plans.