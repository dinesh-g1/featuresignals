# frozen_string_literal: true

module FeatureSignals
  # Represents the user/entity being evaluated.
  # Immutable-style: #with_attribute returns a new copy.
  class EvalContext
    attr_reader :key, :attributes

    def initialize(key:, attributes: {})
      @key = key.freeze
      @attributes = attributes.freeze
      freeze
    end

    # Return a new EvalContext with an additional attribute.
    def with_attribute(name, value)
      self.class.new(key: @key, attributes: @attributes.merge(name.to_s => value))
    end
  end
end
