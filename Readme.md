# ExLMS-NodeJS

## Tong quan cau truc du an

Du an hien tai duoc tach thanh 3 khoi chinh:

- `Server/`: diem vao cua backend, khoi tao Express, HTTP server va Socket.IO
- `src/`: business logic backend, gom `config/`, `models/`, `routes/`, `middleware/`
- `client/`: frontend React + Vite, build ra static files va duoc phuc vu bang Nginx

Ngoai ra con co:

- `public/`: static assets backend va thu muc upload
- `scripts/`: script ho tro, hien co `createAdmin.js`
- `tests/`: tap hop test backend/frontend
- `.github/workflows/`: pipeline CI/CD
- `Dockerfile`: image cho backend
- `client/Dockerfile`: image cho frontend
- `docker-compose.yml`: dung de chay `mongo`, `backend`, `client`

## Nhan xet nhanh ve cau truc hien tai

Cau truc tong the la hop ly cho mot du an fullstack nho den vua:

- Backend da tach `entrypoint` (`Server/`) va `application layer` (`src/`) ro rang.
- Frontend duoc dat rieng trong `client/`, phu hop cho deploy bang Nginx.
- Da co Dockerfile cho ca backend va frontend, cung voi `docker-compose.yml`.
- Da co workflow GitHub Actions de day code va chay deploy tren server.

Mot vai diem nen can nhac cai tien:

1. `public/uploads/` dang nam trong repo.
   Phan nay nen duoc mount volume tren server va tranh commit file upload that vao Git.

2. Script test o root chua dung thuc te.
   Trong [package.json](/e:/Learning/ExLMS-NodeJS/package.json), `npm test` van la placeholder, trong khi repo da co thu muc `tests/`.

3. `Readme.md` truoc do dang rong.
   Nen giu tai lieu deploy va van hanh ngay trong repo de de ban giao.

4. Workflow hien tai deploy bang cach copy ca source len server roi `docker compose up -d --build`.
   Cach nay chay duoc, nhung chua phai quy trinh CI/CD "sach" nhat cho production vi:
   - build tren server
   - chua co buoc test/lint ro rang
   - chua tach bien mat khau thanh file env rieng tren server

## Cach deploy len Ubuntu 22.04 bang Docker

### 1. Chuan bi server

Dang nhap vao Ubuntu 22.04 va cai Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

Kiem tra:

```bash
docker --version
docker compose version
```

### 2. Tao thu muc tren server

```bash
mkdir -p /home/ubuntu/ExLMS/ExLMS-NodeJS
mkdir -p /home/ubuntu/ExLMS/volumes/uploads
```

### 3. Tao file env tren server

Tao file `/home/ubuntu/ExLMS/ExLMS-NodeJS/.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://your-server-ip:5173
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
UPLOADS_DIR=/home/ubuntu/ExLMS/volumes/uploads
```

MongoDB hien duoc bind vao `127.0.0.1:27017`, nen se khong bi public ra Internet.

### 4. Chay tay lan dau

```bash
cd /home/ubuntu/ExLMS/ExLMS-NodeJS
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

Mac dinh hien tai:

- Frontend: cong `5173`
- Backend: cong `3001`
- MongoDB: cong `27017`

Neu server co Nginx/Traefik ben ngoai, ban nen reverse proxy domain ve container `client`.

## De xuat docker-compose cho production

Ban co the tiep tuc dung file hien tai, nhung nen huong toi 3 nguyen tac:

- MongoDB khong public cong neu khong can
- uploads dung volume rieng
- secrets nam trong `.env` tren server, khong commit len Git

Voi repo nay, mapping volume quan trong nhat la:

```yaml
volumes:
  - ${UPLOADS_DIR:-./public/uploads}:/app/public/uploads
```

Tren production, cach tot hon la doi sang mot duong dan co dinh tren server, vi du:

```yaml
volumes:
  - /home/ubuntu/ExLMS/volumes/uploads:/app/public/uploads
```

## Deploy bang GitHub Actions

Workflow hien tai trong [.github/workflows/main.yml](/e:/Learning/ExLMS-NodeJS/.github/workflows/main.yml) co y tuong dung:

- checkout code
- copy source len server qua SCP
- SSH vao server va chay `docker compose up -d --build`

De no chay on dinh, ban can tao cac GitHub Secrets sau:

- `SERVER_HOST`
- `SERVER_USER`
- `SSH_KEY`

### Mau workflow don gian phu hop repo hien tai

Ban co the dung logic nhu sau:

```yaml
name: Deploy ExLMS

on:
  push:
    branches: ["main"]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Copy project to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "."
          target: "/home/${{ secrets.SERVER_USER }}/ExLMS/ExLMS-NodeJS"

      - name: Deploy with Docker Compose
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            APP_DIR=/home/${{ secrets.SERVER_USER }}/ExLMS/ExLMS-NodeJS
            mkdir -p "$APP_DIR"
            mkdir -p /home/${{ secrets.SERVER_USER }}/ExLMS/volumes/uploads
            cd "$APP_DIR"
            test -f .env
            docker compose up -d --build --remove-orphans
            docker compose ps
```

## Quy trinh CI/CD minh khuyen nghi cho repo nay

Neu muon giu don gian va de van hanh:

1. Dev push code len nhanh `main`
2. GitHub Actions copy source len server
3. Server chay `docker compose up -d --build`
4. Uploads va du lieu MongoDB duoc giu bang volume, nen khong mat khi deploy lai

Neu muon tot hon nua cho production:

1. GitHub Actions chay test truoc khi deploy
2. Build image ngay tren GitHub Actions
3. Push image len registry
4. Server chi can `docker compose pull && docker compose up -d`

Mo hinh thu hai sach hon va deploy nhanh hon, nhung can them Docker Hub hoac GHCR.

## Kiem tra sau deploy

Sau moi lan deploy, chay:

```bash
cd /home/ubuntu/ExLMS/ExLMS-NodeJS
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 client
```

Thu cac endpoint/chuc nang:

- Mo frontend qua `http://your-server-ip:5173`
- Goi API `http://your-server-ip:3001/api`
- Kiem tra upload file
- Kiem tra dang nhap Google neu dang dung OAuth
- Kiem tra socket/meeting neu co su dung realtime

## De xuat buoc tiep theo

Neu ban muon chuyen repo nay sang production gon hon, uu tien 3 viec sau:

1. Bo file upload mau khoi Git va chi giu volume tren server
2. Sua workflow de co test truoc deploy
3. Them reverse proxy domain + HTTPS bang Nginx hoac Caddy o ngoai Docker
