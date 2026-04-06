# frozen_string_literal: true

require_relative "lib/featuresignals/version"

Gem::Specification.new do |spec|
  spec.name          = "featuresignals"
  spec.version       = FeatureSignals::VERSION
  spec.authors       = ["FeatureSignals"]
  spec.email         = ["support@featuresignals.com"]

  spec.summary       = "FeatureSignals Ruby SDK — server-side feature flag evaluation"
  spec.description   = "Server-side SDK for FeatureSignals. Fetches and caches feature " \
                        "flags locally with polling or SSE streaming. Zero external " \
                        "dependencies — uses only Ruby stdlib."
  spec.homepage      = "https://github.com/featuresignals/ruby-sdk"
  spec.license       = "Apache-2.0"

  spec.required_ruby_version = ">= 3.1"

  spec.metadata["homepage_uri"]    = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["changelog_uri"]   = "#{spec.homepage}/blob/main/CHANGELOG.md"

  spec.files = Dir["lib/**/*.rb", "LICENSE", "README.md"]
  spec.require_paths = ["lib"]

  spec.add_dependency "openfeature-sdk", "~> 0.4"

  spec.add_development_dependency "minitest", "~> 5.0"
  spec.add_development_dependency "rake", "~> 13.0"
end
