# JurisAgentis Production Deployment Guide

This guide covers the complete deployment process for the JurisAgentis Legal Practice Management Platform in a production environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [SSL Configuration](#ssl-configuration)
- [Deployment Methods](#deployment-methods)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04 LTS or CentOS 8+ (recommended)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: Minimum 50GB SSD
- **CPU**: 2+ cores recommended
- **Network**: Static IP address with domain name

### Required Software

1. **Docker & Docker Compose**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Nginx** (if not using Docker Compose setup)
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

3. **Certbot** (for SSL certificates)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/jurisagentis-app.git
cd jurisagentis-app
```

### 2. Configure Environment Variables

```bash
cp .env.production .env
```

Edit `.env` with your production values:

```env
# Application
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secure-nextauth-secret-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-secure-redis-password

# Email Configuration (Optional)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Generate Secure Keys

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (32 characters)
openssl rand -hex 16
```

## Database Setup

### Using Supabase (Recommended)

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys
3. Run database migrations:
   ```sql
   -- Copy and run the SQL from database/schema.sql in Supabase SQL Editor
   ```

### Self-hosted PostgreSQL

If using your own PostgreSQL instance:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createuser jurisagentis
sudo -u postgres createdb jurisagentis_prod
sudo -u postgres psql -c "ALTER USER jurisagentis WITH ENCRYPTED PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jurisagentis_prod TO jurisagentis;"
```

## SSL Configuration

### Option 1: Let's Encrypt (Recommended)

```bash
# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Custom SSL Certificate

```bash
# Create SSL directory
mkdir -p ssl

# Copy your certificate files
cp your-certificate.crt ssl/server.crt
cp your-private-key.key ssl/server.key

# Set proper permissions
chmod 600 ssl/server.key
chmod 644 ssl/server.crt
```

## Deployment Methods

### Method 1: Docker Compose (Recommended)

This is the simplest deployment method:

```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy
./deploy.sh deploy
```

### Method 2: Manual Docker Deployment

```bash
# Build the application
docker build -t jurisagentis:latest .

# Run with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Method 3: Kubernetes (Advanced)

For large-scale deployments, see `kubernetes/` directory for manifests.

## Post-Deployment Configuration

### 1. Verify Deployment

```bash
# Check application health
curl https://yourdomain.com/api/health

# Check logs
docker-compose logs jurisagentis-app
```

### 2. Create Admin User

```bash
# Access the application and register the first user
# The first registered user will be granted admin privileges
```

### 3. Configure Email Allowlist

Log in as admin and configure the user allowlist in the admin panel.

## Monitoring and Maintenance

### Health Monitoring

The application provides a comprehensive health check endpoint at `/api/health`:

```bash
curl https://yourdomain.com/api/health
```

### Log Management

```bash
# View real-time logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f jurisagentis-app
docker-compose logs -f nginx
docker-compose logs -f redis
```

### Backup Strategy

```bash
# Create backup
./deploy.sh backup

# Automated backups (add to crontab)
0 2 * * * /opt/jurisagentis/deploy.sh backup
```

### Updates

```bash
# Pull latest code
git pull origin main

# Deploy updates
./deploy.sh deploy

# Rollback if needed
./deploy.sh rollback
```

## Security Considerations

### Network Security

1. **Firewall Configuration**:
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw --force enable
   ```

2. **Fail2ban** (recommended):
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

### Application Security

1. **Regular Updates**: Keep all dependencies updated
2. **Security Headers**: Configured in Nginx
3. **Rate Limiting**: Implemented at Nginx level
4. **Data Encryption**: All data encrypted in transit and at rest
5. **Audit Logging**: All actions are logged for compliance

### Database Security

1. Use strong passwords
2. Enable SSL connections
3. Regular backups
4. Row Level Security (RLS) enabled

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check environment variables
docker-compose config

# Check logs
docker-compose logs jurisagentis-app

# Check database connectivity
docker-compose exec jurisagentis-app npm run db:test
```

#### Database Connection Issues

```bash
# Test database connection
docker-compose exec jurisagentis-app psql $DATABASE_URL -c "SELECT 1"

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json
```

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in ssl/server.crt -text -noout

# Test SSL configuration
curl -I https://yourdomain.com
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Check application health
curl https://yourdomain.com/api/health

# Monitor logs for errors
docker-compose logs -f | grep ERROR
```

### Getting Help

1. Check the [troubleshooting guide](TROUBLESHOOTING.md)
2. Review application logs
3. Contact support at support@jurisagentis.com

## Production Checklist

Before going live, ensure:

- [ ] Domain name configured and DNS pointing to server
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Environment variables configured with production values
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Firewall configured
- [ ] Admin user created
- [ ] User allowlist configured
- [ ] Email configuration tested
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Backup and recovery procedures tested

## Performance Optimization

### For High Traffic

1. **Database Optimization**:
   - Connection pooling
   - Read replicas
   - Query optimization

2. **Caching**:
   - Redis for session storage
   - CDN for static assets
   - Application-level caching

3. **Load Balancing**:
   - Multiple application instances
   - Database load balancing
   - Geographic distribution

### Scaling Considerations

- Monitor resource usage
- Plan for peak loads
- Consider microservices architecture for large deployments
- Implement queue system for heavy workloads

## Compliance and Legal

This platform is designed for legal practices and includes:

- Audit logging for all actions
- Data encryption and security
- Role-based access control
- Client confidentiality protections
- Backup and disaster recovery

Ensure your deployment meets local legal and regulatory requirements.

## Support and Maintenance

For ongoing support:

- Regular security updates
- Performance monitoring
- Backup verification
- Disaster recovery testing
- User training and documentation

Contact: support@jurisagentis.com