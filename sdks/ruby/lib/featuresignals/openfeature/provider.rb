# frozen_string_literal: true

require_relative "../client"
require_relative "../client_options"
require_relative "resolution_details"

module FeatureSignals
  module OpenFeature
    # OpenFeature-compatible provider backed by FeatureSignals::Client.
    #
    #   provider = FeatureSignals::OpenFeature::Provider.new("sdk-key",
    #     FeatureSignals::ClientOptions.new(env_key: "production"))
    #   # Register with OpenFeature API, then:
    #   # client.get_boolean_value("my-flag", false)
    #
    class Provider
      FLAG_NOT_FOUND = "FLAG_NOT_FOUND"
      TYPE_MISMATCH  = "TYPE_MISMATCH"
      GENERAL        = "GENERAL"

      attr_reader :metadata, :client

      def initialize(sdk_key, options)
        @client = Client.new(sdk_key, options)
        @metadata = { name: "featuresignals" }.freeze
      end

      def resolve_boolean_evaluation(flag_key, default_value, context = nil)
        resolve(flag_key, default_value, [TrueClass, FalseClass])
      end

      def resolve_string_evaluation(flag_key, default_value, context = nil)
        resolve(flag_key, default_value, [String])
      end

      def resolve_number_evaluation(flag_key, default_value, context = nil)
        resolve(flag_key, default_value, [Integer, Float])
      end

      def resolve_object_evaluation(flag_key, default_value, context = nil)
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

      def shutdown
        @client.close
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
  end
end
