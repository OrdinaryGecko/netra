Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :v1 do
    post :guarded_completions, to: "guarded_completions#create"

    namespace :admin do
      resources :policy_sets, only: %i[index create show]
      resources :policy_versions, only: [] do
        post :publish, on: :member
      end
    end
  end
end
