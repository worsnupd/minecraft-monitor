FROM 023800829229.dkr.ecr.us-east-1.amazonaws.com/node:16.15.0
RUN mkdir -p /usr/src/monitor
WORKDIR /usr/src/monitor
COPY . /usr/src/monitor
RUN npm ci --only=production
CMD ["npm", "run", "start:prod"]
