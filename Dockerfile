FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY contacto.html /usr/share/nginx/html/contacto.html
COPY nosotros.html /usr/share/nginx/html/nosotros.html
COPY servicios.html /usr/share/nginx/html/servicios.html

COPY assets /usr/share/nginx/html/assets
COPY Gorras /usr/share/nginx/html/Gorras
COPY Imagenes /usr/share/nginx/html/Imagenes
COPY ["Fotos de secciones", "/usr/share/nginx/html/Fotos de secciones"]

EXPOSE 80
