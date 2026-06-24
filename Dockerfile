FROM ruby:3.4.7-slim

ENV BUNDLE_PATH=/usr/local/bundle

RUN apt-get update -qq && apt-get install -y \
  build-essential \
  libpq-dev \
  libyaml-dev \
  postgresql-client \
  curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3

COPY . .

COPY docker/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
