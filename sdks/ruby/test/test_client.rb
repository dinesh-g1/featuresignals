# frozen_string_literal: true

require "minitest/autorun"
require "webrick"
require "json"

require_relative "../lib/featuresignals"

class TestClient < Minitest::Test
  CANNED_FLAGS = { "feature-a" => true, "banner" => "hello", "count" => 42 }.freeze

  class << self
    attr_accessor :server, :base_url
  end

  def setup
    return if self.class.server

    self.class.server = WEBrick::HTTPServer.new(
      Port: 0,
      Logger: WEBrick::Log.new("/dev/null"),
      AccessLog: []
    )

    self.class.server.mount_proc "/" do |_req, res|
      res["Content-Type"] = "application/json"
      res.body = JSON.generate(CANNED_FLAGS)
    end

    port = self.class.server.config[:Port]
    self.class.base_url = "http://127.0.0.1:#{port}"
    Thread.new { self.class.server.start }
    sleep 0.1 # allow server to bind
  end

  def make_client(**overrides)
    opts = FeatureSignals::ClientOptions.new(
      env_key: "dev",
      base_url: self.class.base_url,
      polling_interval: 60,
      **overrides
    )
    client = FeatureSignals::Client.new("test-key", opts)
    client.wait_for_ready(timeout: 5)
    client
  end

  def test_bool_variation
    c = make_client
    assert_equal true, c.bool_variation("feature-a", FeatureSignals::EvalContext.new(key: "u1"), false)
  ensure
    c&.close
  end

  def test_string_variation
    c = make_client
    assert_equal "hello", c.string_variation("banner", FeatureSignals::EvalContext.new(key: "u1"), "")
  ensure
    c&.close
  end

  def test_number_variation
    c = make_client
    assert_equal 42, c.number_variation("count", FeatureSignals::EvalContext.new(key: "u1"), 0)
  ensure
    c&.close
  end

  def test_fallback_on_missing_key
    c = make_client
    assert_equal false, c.bool_variation("missing", FeatureSignals::EvalContext.new(key: "u1"), false)
  ensure
    c&.close
  end

  def test_fallback_on_wrong_type
    c = make_client
    assert_equal "nope", c.string_variation("feature-a", FeatureSignals::EvalContext.new(key: "u1"), "nope")
  ensure
    c&.close
  end

  def test_all_flags
    c = make_client
    flags = c.all_flags
    assert_includes flags.keys, "feature-a"
    assert_includes flags.keys, "banner"
    assert_includes flags.keys, "count"
  ensure
    c&.close
  end

  def test_ready
    c = make_client
    assert c.ready?
  ensure
    c&.close
  end

  def test_on_ready_callback
    called = Queue.new
    opts = FeatureSignals::ClientOptions.new(
      env_key: "dev",
      base_url: self.class.base_url,
      polling_interval: 60
    )
    c = FeatureSignals::Client.new("test-key", opts, on_ready: -> { called.push(true) })

    result = begin
               called.pop(true)
             rescue ThreadError
               sleep 1
               begin
                 called.pop(true)
               rescue ThreadError
                 false
               end
             end
    assert result, "on_ready callback should have been called"
  ensure
    c&.close
  end

  Minitest.after_run do
    TestClient.server&.shutdown
  end
end
