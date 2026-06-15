Rails.application.routes.draw do
  root to: "rails/health#show"

  get "up" => "rails/health#show", as: :rails_health_check

  namespace :v1 do
    post :guarded_completions, to: "guarded_completions#create"
    post "chat/completions", to: "chat_completions#create"

    devise_for :users, path: "auth", controllers: {
      sessions: "v1/sessions",
      passwords: "v1/passwords"
    }

    namespace :admin do
      resources :projects, only: %i[index create show update] do
        post :dry_run, on: :member
        resources :api_keys, only: %i[index create destroy]
      end
      resources :policy_sets, only: %i[index create show update]
      resources :policy_versions, only: %i[create update show] do
        post :publish, on: :member
        post :clone, on: :member
        post :test, on: :member
      end
      resources :rules, only: %i[create update destroy]
      resources :users, only: %i[index create update destroy]
    end
  end
end
