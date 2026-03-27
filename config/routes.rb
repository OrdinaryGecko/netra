Rails.application.routes.draw do
  root to: redirect("/app")

  get "/app", to: "frontend#index"
  get "/app/*path", to: "frontend#index"

  namespace :admin do
    resource :session, only: %i[new create destroy]
    resources :policy_sets, only: %i[index show create update]
    resources :policy_versions, only: %i[show create update] do
      post :publish, on: :member
      post :clone, on: :member
      post :dry_run, on: :member
    end
    resources :rules, only: %i[create update destroy]
  end

  get "up" => "rails/health#show", as: :rails_health_check

  namespace :v1 do
    post :guarded_completions, to: "guarded_completions#create"

    namespace :admin do
      resources :policy_sets, only: %i[index create show update]
      resources :policy_versions, only: %i[create update show] do
        post :publish, on: :member
        post :clone, on: :member
        post :test, on: :member
      end
      resources :rules, only: %i[create update destroy]
    end
  end
end
