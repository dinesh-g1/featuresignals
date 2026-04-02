# frozen_string_literal: true

module FeatureSignals
  module OpenFeature
    class ResolutionDetails
      attr_reader :value, :reason, :error_code, :error_message

      def initialize(value:, reason: "CACHED", error_code: nil, error_message: nil)
        @value = value
        @reason = reason
        @error_code = error_code
        @error_message = error_message
      end
    end
  end
end
