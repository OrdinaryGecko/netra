Rails.application.routes.draw do
  root to: "rails/health#show"

  get "up" => "rails/health#show", as: :rails_health_check

  devise_for :users, path: "v1/auth", controllers: {
    sessions: "v1/sessions",
    passwords: "v1/passwords"
  }

  namespace :v1 do
    post :guarded_completions, to: "guarded_completions#create"
    post "chat/completions", to: "chat_completions#create"

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
      resources :users, only: %i[index create update destroy] do
        collection do
          get :me
          patch :update_profile
          patch :update_password
        end
      end
    end
  end
end
