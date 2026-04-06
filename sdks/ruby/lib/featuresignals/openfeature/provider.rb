# frozen_string_literal: true

require_relative "../client"
require_relative "../client_options"
require_relative "resolution_details"

module FeatureSignals
  module OpenFeature
    # OpenFeature-compliant provider backed by FeatureSignals::Client.
    #
    # Implements the method signatures expected by the openfeature-sdk gem
    # (fetch_boolean_value, fetch_string_value, etc.) with keyword arguments.
    #
    #   require "open_feature/sdk"
    #   require "featuresignals"
    #
    #   provider = FeatureSignals::OpenFeature::Provider.new(
    #     "sdk-key", FeatureSignals::ClientOptions.new(env_key: "production"))
    #   OpenFeature::SDK.configure do |config|
    #     config.set_provider(provider)
    #   end
    #   client = OpenFeature::SDK.build_client
    #   value = client.fetch_boolean_value(flag_key: "dark-mode", default_value: false)
    #
    class Provider
      FLAG_NOT_FOUND = "FLAG_NOT_FOUND"
      TYPE_MISMATCH  = "TYPE_MISMATCH"

      attr_reader :metadata, :client

      def initialize(sdk_key, options)
        @client = Client.new(sdk_key, options)
        @metadata = OpenFeature::ProviderMetadata.new("featuresignals")
      end

      def init(evaluation_context: nil)
        @client.wait_for_ready
      end

      def shutdown
        @client.close
      end

      def fetch_boolean_value(flag_key:, default_value:, evaluation_context: nil)
        resolve(flag_key, default_value, [TrueClass, FalseClass])
      end

      def fetch_string_value(flag_key:, default_value:, evaluation_context: nil)
        resolve(flag_key, default_value, [String])
      end

      def fetch_number_value(flag_key:, default_value:, evaluation_context: nil)
        resolve(flag_key, default_value, [Integer, Float])
      end

      def fetch_object_value(flag_key:, default_value:, evaluation_context: nil)
        flags = @client.all_flags
        val = flags[flag_key]
        if val.nil? && !flags.key?(flag_key)
          return ResolutionDetails.new(
            value: default_value,
            error_code: FLAG_NOT_FOUND,
            error_message: "flag '#{flag_key}' not found"
          )
        end
        ResolutionDetails.new(value: val)
      end

      private

      def resolve(flag_key, default_value, expected_types)
        flags = @client.all_flags
        val = flags[flag_key]

        if val.nil? && !flags.key?(flag_key)
          return ResolutionDetails.new(
            value: default_value,
            error_code: FLAG_NOT_FOUND,
            error_message: "flag '#{flag_key}' not found"
          )
        end

        unless expected_types.any? { |t| val.is_a?(t) }
          return ResolutionDetails.new(
            value: default_value,
            error_code: TYPE_MISMATCH,
            error_message: "expected #{expected_types.map(&:name).join('|')}, got #{val.class.name}"
          )
        end

        ResolutionDetails.new(value: val)
      end
    end

    # Simple metadata struct compatible with the openfeature-sdk gem.
    class ProviderMetadata
      attr_reader :name

      def initialize(name)
        @name = name
      end
    end
  end
end
