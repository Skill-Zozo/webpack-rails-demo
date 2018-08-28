team = ENV['ENVIRONMENT_TEAM_NAME']

app_namespace = team ? "reports/#{team}" : "reports/main"
development = ['development', 'test', 'hotfix', 'local'].include?(Rails.env)
Webpack::Railtie.config.webpack.output_dir = "public/#{app_namespace}/webpack"
Webpack::Railtie.config.webpack.public_path = development ? "#{app_namespace}/webpack" : "#{app_namespace}/webpack"
Webpack::Railtie.config.webpack.dev_server.enabled = development
Webpack::Railtie.config.webpack.dev_server.host = ENV['CLIENT_WEBPACK_HOST'] || ENV['FLUID_PUBLIC_IP'] || 'localhost'
Webpack::Railtie.config.webpack.dev_server.manifest_host = ENV['CLIENT_WEBPACK_HOST'] || ENV['FLUID_PUBLIC_IP'] || 'localhost'